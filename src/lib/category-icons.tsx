import React from "react";
import {
  AcademicCapIcon,
  HomeIcon,
  LifebuoyIcon,
  PaperAirplaneIcon,
  FireIcon,
  RocketLaunchIcon,
  BookOpenIcon,
  BuildingOffice2Icon,
  CameraIcon,
  ComputerDesktopIcon,
  CpuChipIcon,
  CubeIcon,
  DeviceTabletIcon,
  DevicePhoneMobileIcon,
  FilmIcon,
  HomeModernIcon,
  MusicalNoteIcon,
  PaintBrushIcon,
  PrinterIcon,
  TvIcon,
  ShieldCheckIcon,
  SpeakerWaveIcon,
  SparklesIcon,
  TrophyIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
} from "react-native-heroicons/outline";

type IconComponent = typeof CubeIcon;

/**
 * One glyph family for the whole taxonomy.
 *
 * The same categories were being presented three different ways: photorealistic
 * stock shots on Home (different lighting, different shadow directions, nothing
 * optically normalised), twelve identical cube glyphs in the listing flow, and
 * no icons at all in the request form. A single-weight outline set makes shape
 * usable for scanning, which is the only reason to reserve an icon column.
 *
 * Keys are matched case-insensitively and ignore punctuation, so "Art & Craft",
 * "Arts & Crafts" and "arts and crafts" all land on the same glyph.
 */
const ICONS: Record<string, IconComponent> = {
  appliances: FireIcon,
  appliance: FireIcon,
  artcraft: PaintBrushIcon,
  artcrafts: PaintBrushIcon,
  artscrafts: PaintBrushIcon,
  audiodevice: SpeakerWaveIcon,
  automobiles: TruckIcon,
  automobile: TruckIcon,
  airplane: PaperAirplaneIcon,
  helicopter: PaperAirplaneIcon,
  bus: TruckIcon,
  car: TruckIcon,
  truck: TruckIcon,
  golfcart: TruckIcon,
  cycle: LifebuoyIcon,
  bike: LifebuoyIcon,
  scooter: LifebuoyIcon,
  boat: LifebuoyIcon,
  tent: HomeIcon,
  treadmill: TrophyIcon,
  books: BookOpenIcon,
  cameralens: CameraIcon,
  clothing: SparklesIcon,
  drone: PaperAirplaneIcon,
  electronicaccessories: CpuChipIcon,
  electronics: CpuChipIcon,
  emerging: RocketLaunchIcon,
  fashion: SparklesIcon,
  formalwear: SparklesIcon,
  furniture: HomeModernIcon,
  gamingconsole: TvIcon,
  laptopdesktop: ComputerDesktopIcon,
  machinery: WrenchScrewdriverIcon,
  machines: WrenchScrewdriverIcon,
  musicalinstruments: MusicalNoteIcon,
  musicals: MusicalNoteIcon,
  phone: DevicePhoneMobileIcon,
  photographyequipment: CameraIcon,
  printerscanner: PrinterIcon,
  projector: FilmIcon,
  realestate: BuildingOffice2Icon,
  securitysurveillance: ShieldCheckIcon,
  sports: TrophyIcon,
  tablet: DeviceTabletIcon,
  tv: TvIcon,
  wearables: AcademicCapIcon,
};

function keyOf(name: string) {
  return (name ?? "").toLowerCase().replace(/[^a-z]/g, "");
}

export function categoryIconFor(name: string): IconComponent {
  return ICONS[keyOf(name)] ?? CubeIcon;
}

/** Renders the glyph for a category name. */
export function CategoryIcon({
  name,
  size = 24,
  color,
  strokeWidth = 1.6,
}: {
  name: string;
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  const Icon = categoryIconFor(name);
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}

/**
 * Display names for the taxonomy.
 *
 * The same categories were spelled differently depending on where you met them
 * — Home said "Machines", "Appliances", "Fashion"; the listing flow said
 * "Machinery", "Appliance", "Clothing" — because one list is bundled and the
 * other comes from the API. Normalising at the render site is the only fix
 * available on the client, and it also lets "Musicals" say what it means:
 * musicals are theatre, musical instruments are what Renit rents.
 */
const DISPLAY_NAMES: Record<string, string> = {
  musicals: "Musical instruments",
  musicalinstruments: "Musical instruments",
  machinery: "Machines",
  machines: "Machines",
  appliance: "Appliances",
  appliances: "Appliances",
  clothing: "Fashion",
  fashion: "Fashion",
  formalwear: "Fashion",
  artcraft: "Arts & crafts",
  artcrafts: "Arts & crafts",
  artscrafts: "Arts & crafts",
  realestate: "Real estate",
  laptopdesktop: "Laptops & desktops",
  printerscanner: "Printers & scanners",
  securitysurveillance: "Security & surveillance",
  electronicaccessories: "Electronic accessories",
  cameralens: "Camera lenses",
  photographyequipment: "Photography equipment",
  gamingconsole: "Gaming consoles",
  audiodevice: "Audio devices",
};

export function categoryDisplayName(name: string): string {
  return DISPLAY_NAMES[keyOf(name)] ?? name;
}
