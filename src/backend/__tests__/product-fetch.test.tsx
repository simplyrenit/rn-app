import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";
import axiosInstance from "@/lib/networkUtils";

jest.mock("@/lib/config", () => ({
  GET_PRODUCT_DETAILS: "https://api.test/products/",
  GET_REVIEWS: "",
  SIMILAR_PRODUCTS: "",
}));
jest.mock("@/lib/networkUtils", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("@/context/global-context", () => ({ useGlobalContext: () => ({ authTokens: null }) }));

// eslint-disable-next-line import/first
import { useProduct } from "../product";

const get = (axiosInstance as unknown as { get: jest.Mock<(...args: unknown[]) => Promise<unknown>> }).get;

let fetchProduct: ReturnType<typeof useProduct>["fetchProduct"];
function Probe() {
  fetchProduct = useProduct().fetchProduct;
  return null;
}

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({ data: { name: "PRO_1" } });
  act(() => {
    TestRenderer.create(<Probe />);
  });
});

describe("fetchProduct (ENG-284 D3)", () => {
  it("asks for delivery to the session's address by id", async () => {
    await act(async () => {
      await fetchProduct("PRO_1", 42);
    });
    expect(get).toHaveBeenCalledWith(
      "https://api.test/products/PRO_1/",
      expect.objectContaining({ params: { deliver_address: 42 } })
    );
  });

  it("sends no param without an address", async () => {
    await act(async () => {
      await fetchProduct("PRO_1", null);
      await fetchProduct("PRO_1");
    });
    for (const call of get.mock.calls) expect(call[1]).not.toHaveProperty("params");
  });
});
