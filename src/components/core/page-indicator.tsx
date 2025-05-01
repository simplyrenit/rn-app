import React from "react";
import { StyleSheet, View } from "react-native";

interface PageIndicatorProps {
  percentage: number;
}

export const PageIndicator: React.FC<PageIndicatorProps> = ({ percentage }) => {
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  const fullDashes = Math.floor(clampedPercentage / 33.33);
  const partialFill = (clampedPercentage % 33.33) / 33.33;
  return (
    <View className="flex flex-row items-center justify-center">
      {[0, 1, 2].map((index) => (
        <View key={index} style={styles.dashContainer}>
          <View
            style={[
              styles.dash,
              styles.grayDash,
              index < fullDashes && styles.blueDash,
              index === fullDashes && {
                flexDirection: "row",
                overflow: "hidden",
              },
            ]}
          >
            {index === fullDashes && (
              <>
                <View style={[styles.partialFill, { flex: partialFill }]} />
                <View
                  style={[styles.remainingFill, { flex: 1 - partialFill }]}
                />
              </>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  dashContainer: {
    marginHorizontal: 2,
  },
  dash: {
    width: 30,
    height: 4,
    borderRadius: 2,
  },
  grayDash: {
    backgroundColor: "#D1D5DB",
  },
  blueDash: {
    backgroundColor: "#635BE8",
  },
  partialFill: {
    height: "100%",
    backgroundColor: "#635BE8",
  },
  remainingFill: {
    height: "100%",
    backgroundColor: "#D1D5DB",
  },
});
