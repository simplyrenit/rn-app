import { EmptyState } from "@/components/core/empty-state";
import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";
import { ExclamationTriangleIcon } from "react-native-heroicons/outline";

/**
 * What the person sees when a screen throws while rendering: a sentence and one button, in the app's look. No stack, no error
 * text, no code. It is a function component so it can read the theme, which the boundary (a class) cannot.
 */
function Fallback({ onRetry }: { onRetry: () => void }) {
  const { color } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: "center", backgroundColor: color.canvas }}>
      <EmptyState
        variant="error"
        icon={<ExclamationTriangleIcon size={28} color={color.danger} />}
        title="Something went wrong on this screen"
        body="Nothing you did is lost. Go back to Home and try again."
        actionLabel="Try again"
        onAction={onRetry}
      />
    </View>
  );
}

interface State {
  failed: boolean;
  /** Each retry mounts the children afresh, at the navigation's first screen: the Home tab. */
  attempt: number;
}

/**
 * The one error boundary of the app, round the navigation tree and inside the providers (decision T-55). Before it, any render
 * error left a blank white page until the app was restarted (test run D-08 looked like that to a person). It logs the error as
 * the rest of the app does (`console.error`) and shows `Fallback`; "Try again" resets it, which remounts the navigation and so
 * lands on the Home tab. In development the red box still shows first.
 */
export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { failed: false, attempt: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    console.error("A screen failed to render:", error, info?.componentStack ?? "");
  }

  private retry = () => this.setState((state) => ({ failed: false, attempt: state.attempt + 1 }));

  render() {
    if (this.state.failed) return <Fallback onRetry={this.retry} />;
    return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
  }
}
