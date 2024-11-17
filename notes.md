# for navigation between components and screens

- use `useTypedNavigation` from `@/lib/types`
- and if you need to access any params from one screen to another, assume the following scenario

```tsx
// navigating to the "Profile" Screen
navigation.navigate("Profile", { userId: "123" });

// Inside the Profile Screen, to Access this component we do
import { RouteProps } from "@/lib/types";
import { useRoute } from "@react-navigation/native";

function Screen() {
  const route = useRoute<RouterProps<"Profile">>();
  const { userId } = route.params;

  clg(userId); // 123
}
```
