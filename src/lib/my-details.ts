import { MY_DETAILS_ENDPOINT } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { AccountType, MerchantApprovalStatus } from "@/lib/types";

export interface MyDetailsResponse {
  username: string;
  firebase_uid: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  country: string;
  image: {
    image_url: string;
    name: string;
  } | null;
  addresses: {
    address: string;
    address_line_1: string;
    address_line_2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    address_type: string;
    coordinates: {
      lat: number;
      long: number;
    };
    is_default: boolean;
  }[];
  business_name: string | null;
  account_type: AccountType;
  merchant_approval_status: MerchantApprovalStatus;
  coordinates: {
    lat: number;
    long: number;
  };
  timezone: string;
  email_verified: boolean;
  phone_verified: boolean;
  date_joined?: string;
  currency?: string;
}

let myDetailsRequest: Promise<MyDetailsResponse> | null = null;
let myDetailsRequestKey: string | null = null;
let myDetailsAbortController: AbortController | null = null;

export function cancelMyDetailsRequest() {
  myDetailsAbortController?.abort();
  myDetailsRequest = null;
  myDetailsRequestKey = null;
  myDetailsAbortController = null;
}

export async function fetchMyDetailsRequest(token?: string) {
  const requestKey = token ?? "__default__";

  if (myDetailsRequest && myDetailsRequestKey === requestKey) {
    return myDetailsRequest;
  }

  const controller = new AbortController();
  myDetailsRequestKey = requestKey;
  myDetailsAbortController = controller;
  myDetailsRequest = axiosInstance
    .get<MyDetailsResponse>(
      MY_DETAILS_ENDPOINT,
      token
        ? {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        : { signal: controller.signal }
    )
    .then((response) => response.data)
    .finally(() => {
      if (myDetailsAbortController === controller) {
        myDetailsRequest = null;
        myDetailsRequestKey = null;
        myDetailsAbortController = null;
      }
    });

  return myDetailsRequest;
}
