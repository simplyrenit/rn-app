import React from "react";
import {
  AcademicCapIcon,
  HomeIcon,
  LifebuoyIcon,
  PaperAirplaneIcon,
  FireIcon,
  RocketLaunchIcon,
  BookOpenIcon,
  BriefcaseIcon,
  BuildingOffice2Icon,
  CakeIcon,
  CameraIcon,
  ComputerDesktopIcon,
  CpuChipIcon,
  CubeIcon,
  DeviceTabletIcon,
  DevicePhoneMobileIcon,
  FaceSmileIcon,
  FilmIcon,
  HeartIcon,
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
import { foldForSearch } from "./taxonomy-search";

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
 * Keys are matched case-insensitively and ignore punctuation and accents, so
 * "Art & Craft", "Arts & Crafts" and "arts and crafts" all land on the same
 * glyph. A taxonomy v2 slug reduces to the same key as its title
 * ("art-decor-hobby", "Art, Décor & Hobby"), so one entry serves both.
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
  // Taxonomy v2 parents (ENG-29), keyed by slug.
  electronicscomputing: CpuChipIcon,
  photovideoproduction: CameraIcon,
  audiomusicdj: MusicalNoteIcon,
  automobilesmobility: TruckIcon,
  fitnesssports: TrophyIcon,
  gamingvremergingtech: RocketLaunchIcon,
  machinestoolsequipment: WrenchScrewdriverIcon,
  fashionaccessories: SparklesIcon,
  artdecorhobby: PaintBrushIcon,
  eventscelebrations: CakeIcon,
  babykids: FaceSmileIcon,
  healthmedical: HeartIcon,
  traveloutdooroffice: BriefcaseIcon,
};

function keyOf(name: string) {
  return foldForSearch(name).replace(/[^a-z]/g, "");
}

/**
 * Slug first, then name: the slug is fixed when the row is created, the title
 * can be renamed by the taxonomy loader. Servers before ENG-28 send no slug.
 */
function lookup<T>(table: Record<string, T>, name: string, slug?: string | null) {
  return (slug ? table[keyOf(slug)] : undefined) ?? table[keyOf(name)];
}

export function categoryIconFor(name: string, slug?: string | null): IconComponent {
  return lookup(ICONS, name, slug) ?? CubeIcon;
}

/** Renders the glyph for a category name. */
export function CategoryIcon({
  name,
  slug,
  size = 24,
  color,
  strokeWidth = 1.6,
}: {
  name: string;
  slug?: string | null;
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  const Icon = categoryIconFor(name, slug);
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
  // Taxonomy v2 parents (ENG-29), in the same sentence case as the rest.
  furniture: "Furniture",
  electronicscomputing: "Electronics & computing",
  photovideoproduction: "Photo, video & production",
  audiomusicdj: "Audio, music & DJ",
  automobilesmobility: "Automobiles & mobility",
  fitnesssports: "Fitness & sports",
  gamingvremergingtech: "Gaming, VR & emerging tech",
  machinestoolsequipment: "Machines, tools & equipment",
  fashionaccessories: "Fashion & accessories",
  artdecorhobby: "Art, décor & hobby",
  books: "Books",
  eventscelebrations: "Events & celebrations",
  babykids: "Baby & kids",
  healthmedical: "Health & medical",
  traveloutdooroffice: "Travel, outdoor & office",
};

export function categoryDisplayName(name: string, slug?: string | null): string {
  return lookup(DISPLAY_NAMES, name, slug) ?? name;
}
