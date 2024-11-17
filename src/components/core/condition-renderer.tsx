import {
  BadCondition,
  GoodCondition,
  ExcellentCondition,
} from "@/icons/conditions";

export function ConditionRenderer({
  condition,
  size,
  color,
}: {
  condition: string;
  size: number;
  color: string;
}) {
  if (condition.toLowerCase() === "excellent")
    return <ExcellentCondition size={size} color={color} />;
  if (condition.toLowerCase() === "good")
    return <GoodCondition size={size} color={color} />;
  if (condition.toLowerCase() === "bad")
    return <BadCondition size={size} color={color} />;
}
