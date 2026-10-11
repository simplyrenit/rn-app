import { useClaim } from "@/backend/claims";
import { Panel } from "@/components/booking/parts";
import { useServerNow } from "@/components/booking/use-server-now";
import { Text } from "@/components/core";
import { LinkRow } from "@/components/handover/parts";
import { Side } from "@/lib/capture";
import { claimRowSub, kindLabel } from "@/lib/claims";
import { space } from "@/lib/design-tokens";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { View } from "react-native";

function ClaimRow({ id, role, first }: { id: number; role: Side; first: boolean }) {
  const navigation = useTypedNavigation();
  const query = useClaim(id);
  // The claim carries no `server_time`: the answer's own `Date` header stands in for it.
  const now = useServerNow(query.data?.serverTime, query.dataUpdatedAt);
  const claim = query.data?.claim;
  return (
    <LinkRow
      first={first}
      title={claim ? kindLabel(claim.kind) : "A report on this booking"}
      sub={claim ? claimRowSub(claim, role, now, Boolean(query.data?.serverTime)) : query.isError ? "Open it to see where it stands." : "Loading…"}
      onPress={() => navigation.navigate("Claim", { id, role })}
    />
  );
}

/**
 * The claims on a booking (`claims`: their ids), as rows that open each one: a fault
 * report, a "not as described" report, a damage claim. Each row says where its claim
 * stands, so the person never has to open it to find out whether it was decided.
 */
export function ClaimRows({ ids, role, title = "Reports and claims" }: { ids: number[] | null | undefined; role: Side; title?: string }) {
  if (!ids || ids.length === 0) return null;
  return (
    <View style={{ gap: space.sm }}>
      <Text role="sectionTitle" accessibilityRole="header">
        {title}
      </Text>
      <Panel>
        {ids.map((id, index) => (
          <ClaimRow key={id} id={id} role={role} first={index === 0} />
        ))}
      </Panel>
    </View>
  );
}
