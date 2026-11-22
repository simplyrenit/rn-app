/**
 * DevFixture (ENG-426, dev builds only): turns a design fixture on (or `off`) and opens its screen. Opened by
 * `renit-qa://dev/fixture/<frameId>` (src/dev/links.ts).
 *
 * Switching empties React Query and loads again what the app loads at launch (the user, the category list), so
 * nothing from before the switch is left on screen. It runs here, inside the providers, because those loaders
 * live in the global context.
 *
 * Reached only through `__DEV__ ? require(...) : null` in nav.tsx: release bundles never contain it.
 */
import { useGlobalContext } from "@/context/global-context";
import { activateFixture, deactivateFixture } from "@/dev/design-fixtures/interceptor";
import { FIXTURES } from "@/dev/design-fixtures/registry";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { StackActions, useRoute } from "@react-navigation/native";
import React, { useEffect } from "react";
import { View } from "react-native";
import { useQueryClient } from "react-query";

// Exported so a release bundle that contained this module would show it (README, release safety).
export const RENIT_DEV_FIXTURE_SCREEN_MARKER = "RENIT_DEV_FIXTURE_SCREEN_MARKER";

export default function DevFixtureScreen() {
  const { params } = useRoute<RouteProps<"DevFixture">>();
  const navigation = useTypedNavigation();
  const queryClient = useQueryClient();
  const { fetchUserDetails, fetchCategories } = useGlobalContext();

  useEffect(() => {
    const { frameId } = params;
    const on = frameId !== "off" && activateFixture(frameId);
    if (!on) deactivateFixture();
    if (frameId !== "off" && !on) console.warn("[design-fixture]", `no fixture for ${frameId}; fixtures are off`);
    else console.log("[design-fixture]", on ? `on: ${frameId}` : "off");
    queryClient.clear();
    // Settled, not all: a failed reload must still open the screen, which shows the failure itself.
    void Promise.allSettled([fetchUserDetails(), fetchCategories()]).then(() => {
      const fixture = on ? FIXTURES[frameId] : null;
      if (fixture) navigation.dispatch(StackActions.replace(fixture.route, fixture.params));
      else navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
    });
  }, [params.frameId]);

  return <View style={{ flex: 1 }} />;
}
