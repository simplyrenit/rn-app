import { useGlobalContext } from "@/context/global-context";
import { apiError, failureCode } from "@/lib/api-error";
import { Cart, CartProduct, CartShop, withLine, withoutLine } from "@/lib/cart";
import { CART_ENDPOINT } from "@/lib/config";
import { track } from "@/lib/events";
import axiosInstance from "@/lib/networkUtils";
import { useMutation, useQuery, useQueryClient } from "react-query";

/** Keyed on the username, like the bookings: another account signed in on this phone never reads this cart (QA 11). */
export const cartQueryKey = (username: string | undefined) => ["cart", username];

const lineUrl = (name: string) => `${CART_ENDPOINT}lines/${encodeURIComponent(name)}/`;

export async function fetchCart(): Promise<Cart> {
  return (await axiosInstance.get<Cart>(CART_ENDPOINT)).data;
}

/**
 * One line in, one line out. Every add and remove goes through these two, whoever calls them, so the cart's events
 * (cart plan §9.5) are sent here.
 */
export async function addCartLine(name: string): Promise<Cart> {
  try {
    const { data } = await axiosInstance.put<Cart>(lineUrl(name));
    track("cart_add", { product: name });
    return data;
  } catch (error) {
    track("cart_add_failed", { product: name, code: failureCode(apiError(error)) });
    throw error;
  }
}

export async function deleteLine(name: string): Promise<Cart> {
  const { data } = await axiosInstance.delete<Cart>(lineUrl(name));
  track("cart_remove", { product: name });
  return data;
}

/**
 * The signed-in customer's cart, and adding and removing its lines. Both writes
 * change the cache before the request leaves the phone and put it back if the
 * request fails (the favourites pattern, `useSaved`); the answer is the whole
 * cart, which then replaces the guess. Both are idempotent on the server, so a
 * retry after a lost answer adds nothing twice (QA 2). Signed out there is no
 * cart and the writes are not called: Add to cart asks for sign-in first.
 */
export function useCart() {
  const { authTokens, isAuthenticated, userDetails } = useGlobalContext();
  const username = userDetails?.username;
  const signedIn = Boolean(isAuthenticated && authTokens?.access_token && username);
  const key = cartQueryKey(username);
  const queryClient = useQueryClient();

  const query = useQuery(key, fetchCart, {
    enabled: signedIn,
    // The badge on Home and every product page reads this; without a stale
    // window each one that mounts asks again (the same reason as `useSaved`).
    staleTime: 30_000,
  });

  /** One write: guess the answer, send, keep the server's answer or put the old cart back. */
  const write = <Input,>(send: (input: Input) => Promise<Cart>, guess: (cart: Cart, input: Input) => Cart) => ({
    mutationFn: send,
    onMutate: async (input: Input) => {
      await queryClient.cancelQueries(key);
      const previous = queryClient.getQueryData<Cart>(key);
      if (previous) queryClient.setQueryData<Cart>(key, guess(previous, input));
      return { previous };
    },
    onError: (_error: unknown, _input: Input, context: unknown) => {
      const previous = (context as { previous?: Cart } | undefined)?.previous;
      if (previous) queryClient.setQueryData(key, previous);
    },
    onSuccess: (answer: Cart) => {
      queryClient.setQueryData(key, answer);
    },
    // A rollback restores the cart as it was before this write, which may undo another write that
    // landed meanwhile; reading it again settles it.
    onSettled: () => {
      void queryClient.invalidateQueries(key);
    },
  });

  const addLine = useMutation(
    write<{ product: CartProduct; shop: CartShop }>(
      ({ product }) => addCartLine(product.name),
      (cart, { product, shop }) => withLine(cart, shop, product)
    )
  );

  const removeLine = useMutation(
    write<string>(deleteLine, (cart, name) => withoutLine(cart, name))
  );

  return {
    cart: query.data,
    query,
    signedIn,
    add: addLine.mutateAsync,
    remove: removeLine.mutateAsync,
  };
}
