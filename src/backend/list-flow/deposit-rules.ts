import { DEPOSIT_RULES } from "@/lib/config";
import { DEFAULT_DEPOSIT_RULE, parseDepositRule } from "@/lib/list-flow/deposit";
import { DepositRule, WireDepositRule } from "@/lib/list-flow/types";
import axiosInstance from "@/lib/networkUtils";
import { useQuery } from "react-query";

let rulesRequest: Promise<DepositRule[]> | null = null;

/**
 * `GET /api/deposit-rules/`, once per app session (§7.1). A failed request is
 * forgotten so the next caller tries again; until then the default rule, which
 * is also what the server seeds for every category, stands in.
 */
export function fetchDepositRules(): Promise<DepositRule[]> {
  if (!rulesRequest) {
    rulesRequest = axiosInstance
      .get<WireDepositRule[]>(DEPOSIT_RULES)
      .then((response) =>
        (response.data ?? [])
          .map((rule) => parseDepositRule(rule))
          .filter((rule): rule is DepositRule => rule !== null)
      )
      .catch((error) => {
        rulesRequest = null;
        throw error;
      });
  }
  return rulesRequest;
}

export function ruleForParent(rules: DepositRule[] | undefined, parent: string | undefined) {
  return rules?.find((rule) => rule.parent === parent) ?? DEFAULT_DEPOSIT_RULE;
}

export function useDepositRules() {
  return useQuery(["deposit-rules"], fetchDepositRules, {
    staleTime: Infinity,
    cacheTime: Infinity,
    retry: 1,
  });
}
