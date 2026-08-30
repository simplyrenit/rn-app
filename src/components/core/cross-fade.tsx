import { duration } from "@/lib/design-tokens";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleProp, ViewStyle } from "react-native";
import { useReduceMotion } from "./use-press-feedback";

interface Props {
  /** When true the placeholder is shown; when false, the children. */
  loading: boolean;
  /** The skeleton (or spinner) shown while `loading`. */
  placeholder: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Loading → content, without the hard cut.
 *
 * Every screen in the app swapped a skeleton for real content in a single
 * frame, which reads as a flicker rather than as arrival. This overlaps the two
 * for `duration.base`: the outgoing node fades out on top while the incoming
 * one fades in underneath. Layout is driven by the incoming node, so the
 * container never jumps to the skeleton's height.
 *
 * Wrap an existing ternary as-is:
 *   <CrossFade loading={isLoading} placeholder={<Skeleton />}>{list}</CrossFade>
 */
export function CrossFade({ loading, placeholder, children, style }: Props) {
  const reduceMotion = useReduceMotion();
  const incoming = useRef(new Animated.Value(1)).current;
  const outgoing = useRef(new Animated.Value(0)).current;

  // Keep the last requested state in a ref. Updating state inside this effect
  // used to rerun its cleanup immediately and stop the fade at opacity 0/1,
  // leaving successful product, chat, and owner requests behind a skeleton.
  const shownLoading = useRef(loading);
  const [outgoingLoading, setOutgoingLoading] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading === shownLoading.current) return;
    const previousLoading = shownLoading.current;
    shownLoading.current = loading;

    if (reduceMotion) {
      // A cross-fade is motion too. Reduce Motion gets the honest hard swap
      // rather than a slower version of the same effect.
      incoming.setValue(1);
      outgoing.setValue(0);
      setOutgoingLoading(null);
      return;
    }

    incoming.setValue(0);
    outgoing.setValue(1);
    setOutgoingLoading(previousLoading);

    const animation = Animated.parallel([
      Animated.timing(incoming, {
        toValue: 1,
        duration: duration.base,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(outgoing, {
        toValue: 0,
        duration: duration.base,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) setOutgoingLoading(null);
    });

    return () => animation.stop();
  }, [loading, reduceMotion, incoming, outgoing]);

  // Whatever we were showing a moment ago is the node that fades out.
  const outgoingNode =
    outgoingLoading === null
      ? null
      : outgoingLoading
      ? placeholder
      : children;

  return (
    <Animated.View style={style}>
      <Animated.View style={{ opacity: incoming }}>
        {loading ? placeholder : children}
      </Animated.View>

      {outgoingNode ? (
        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            opacity: outgoing,
          }}
        >
          {outgoingNode}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
