import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
 * Two glyph families, split by tier.
 *
 * Parent categories keep the single-weight Heroicons outline set: the same
 * categories were being presented three different ways (photorealistic stock
 * shots on Home, twelve identical cube glyphs in the listing flow, no icons in
 * the request form), and one outline weight makes shape usable for scanning.
 *
 * Sub-categories use Material Community outline glyphs instead. Heroicons has
 * nothing at item level (fridge, air conditioner, washing machine, excavator...),
 * so all 210 sub-category tiles on the Category landing fell through to the same
 * cube. Material Community Icons is already installed via @expo/vector-icons and
 * has a line glyph for nearly every item (Yash chose it on 2026-10-03). Where
 * nothing fits, a sub-category gets a generic glyph rather than a misleading
 * specific one.
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

/**
 * Taxonomy v2 sub-categories (ENG-77), keyed by slug, to a Material Community
 * glyph. Only the slug is used: sub-category titles repeat across parents
 * ("Accessories", "Drone"), the slug does not.
 */
export const SUB_ICONS: Record<string, string> = {
  appliancesairconditionerac: "air-conditioner",
  appliancesaircooler: "fan",
  applianceswatercooler: "cup-water",
  appliancesairpurifier: "air-purifier",
  appliancescoffeemachine: "coffee-maker-outline",
  applianceskitchenware: "pot-steam-outline",
  appliancesmicrowave: "microwave",
  appliancesrefrigerator: "fridge-outline",
  appliancessmarthomedevices: "home-automation",
  appliancestelevision: "television",
  appliancesvacuumcleaner: "vacuum-outline",
  applianceswashingmachine: "washing-machine",
  applianceswaterpurifier: "water-check-outline",
  appliancesbarbecuegrill: "grill-outline",
  appliancesfan: "fan",
  appliancesfloorcleaningmachine: "robot-vacuum",
  appliancesheater: "radiator",
  applianceskitchenappliances: "toaster-oven",
  appliancesother: "dots-horizontal-circle-outline",
  furniturebarcabinet: "glass-cocktail",
  furniturebed: "bed-outline",
  furniturebookshelves: "bookshelf",
  furniturechair: "seat-outline",
  furniturediningorcentretable: "table-furniture",
  furnituredresser: "dresser-outline",
  furnituremattress: "bed-double-outline",
  furnitureshoerack: "shoe-sneaker",
  furnituresidetablebedstand: "table-furniture",
  furnituresofarecliner: "sofa-outline",
  furniturewardrobe: "wardrobe-outline",
  furniturebeanbagpouf: "sofa-single-outline",
  furniturebedding: "bed-king-outline",
  furniturefurnitureset: "table-chair",
  furnitureoutdoorfurniture: "table-picnic",
  furniturestoragecabinetrack: "cupboard-outline",
  furniturestudytabledesk: "desk",
  furnituretvunit: "television-classic",
  furnitureother: "dots-horizontal-circle-outline",
  electronicscomputingelectronicaccessories: "cable-data",
  electronicscomputinglaptopdesktop: "laptop",
  electronicscomputingphone: "cellphone",
  electronicscomputingprinterscanner: "printer-outline",
  electronicscomputingprojector: "projector",
  electronicscomputingsecuritysurveillance: "cctv",
  electronicscomputingtablet: "tablet",
  electronicscomputingwearables: "watch",
  electronicscomputingdisplayledwall: "billboard",
  electronicscomputingprojectorscreen: "projector-screen-outline",
  electronicscomputingwalkietalkie: "radio-handheld",
  electronicscomputingwifinetworking: "router-wireless",
  electronicscomputingother: "dots-horizontal-circle-outline",
  photovideoproductionantiques: "image-frame",
  photovideoproductionstudiogear: "spotlight-beam",
  photovideoproductioncameralens: "camera-outline",
  photovideoproductiondrone: "drone",
  photovideoproductionphotobooth: "camera-party-mode",
  photovideoproductionpropssetpieces: "theater",
  photovideoproductiontripodgimbal: "video-stabilization",
  photovideoproductionother: "dots-horizontal-circle-outline",
  audiomusicdjaudiodevice: "speaker",
  audiomusicdjdjgear: "disc-player",
  audiomusicdjdrumspercussion: "music-note-outline",
  audiomusicdjflutewoodwind: "saxophone",
  audiomusicdjguitar: "guitar-acoustic",
  audiomusicdjmicrophonemic: "microphone-outline",
  audiomusicdjmusicaccessories: "guitar-pick-outline",
  audiomusicdjpianokeyboard: "piano",
  audiomusicdjsitarindianstrings: "music-clef-treble",
  audiomusicdjtrumpetbrass: "trumpet",
  audiomusicdjviolincello: "violin",
  audiomusicdjmixeramplifier: "amplifier",
  audiomusicdjother: "dots-horizontal-circle-outline",
  automobilesmobilityaccessories: "car-settings",
  automobilesmobilitybus: "bus",
  automobilesmobilitycar: "car-outline",
  automobilesmobilitygolfcart: "golf-cart",
  automobilesmobilityminibus: "van-passenger",
  automobilesmobilitymotorcycle: "motorbike",
  automobilesmobilitypickupminitruck: "car-pickup",
  automobilesmobilityscooter: "scooter",
  automobilesmobilitythreewheeler: "rickshaw",
  automobilesmobilitytoolsequipmentautomobile: "car-wrench",
  automobilesmobilitytruck: "truck-outline",
  automobilesmobilityvan: "van-utility",
  automobilesmobilitywatercraft: "sail-boat",
  automobilesmobilityatvgokart: "go-kart",
  automobilesmobilitycaravancampervan: "caravan",
  automobilesmobilityother: "dots-horizontal-circle-outline",
  fitnesssportsboardgames: "chess-knight",
  fitnesssportscricket: "cricket",
  fitnesssportsfootball: "soccer",
  fitnesssportsgym: "dumbbell",
  fitnesssportskayaking: "kayaking",
  fitnesssportsbilliardspool: "billiards",
  fitnesssportsskating: "roller-skate",
  fitnesssportssurfing: "surfing",
  fitnesssportstabletennis: "table-tennis",
  fitnesssportstennis: "tennis",
  fitnesssportsbadminton: "badminton",
  fitnesssportsbaseball: "baseball",
  fitnesssportscycle: "bike",
  fitnesssportsgolf: "golf",
  fitnesssportspickleball: "racquetball",
  fitnesssportsbasketball: "basketball",
  fitnesssportsvolleyball: "volleyball",
  fitnesssportsboxingmartialarts: "boxing-glove",
  fitnesssportsdivingsnorkeling: "diving-snorkel",
  fitnesssportshockey: "hockey-sticks",
  fitnesssportskickscooterhoverboard: "human-scooter",
  fitnesssportspoolhottubsauna: "hot-tub",
  fitnesssportsskisnowgear: "ski",
  fitnesssportssportsgroundequipment: "soccer-field",
  fitnesssportsother: "dots-horizontal-circle-outline",
  gamingvremergingtechgamingconsole: "controller-classic-outline",
  gamingvremergingtecharcademachine: "space-invaders",
  gamingvremergingtechvrheadset: "virtual-reality",
  gamingvremergingtechother: "dots-horizontal-circle-outline",
  machinestoolsequipmentbulldozer: "bulldozer",
  machinestoolsequipmentcrane: "crane",
  machinestoolsequipmentdieselgeneratordg: "engine-outline",
  machinestoolsequipmentfarmseeder: "seed-outline",
  machinestoolsequipmentfarmspreadersprayer: "sprinkler-variant",
  machinestoolsequipmentforklift: "forklift",
  machinestoolsequipmentharvester: "tractor-variant",
  machinestoolsequipmentindustrialequipment: "factory",
  machinestoolsequipmentroadroller: "hammer-wrench",
  machinestoolsequipmenttractor: "tractor",
  machinestoolsequipmentconstructionequipment: "hard-hat",
  machinestoolsequipmentexcavatorloader: "excavator",
  machinestoolsequipmentladderscaffolding: "ladder",
  machinestoolsequipmentlawngardenmachine: "mower",
  machinestoolsequipmentportablecabincontainer: "truck-cargo-container",
  machinestoolsequipmentpowertools: "hammer-screwdriver",
  machinestoolsequipmentpressurewasher: "spray-bottle",
  machinestoolsequipmentrotavatortillage: "tractor-variant",
  machinestoolsequipmentscissorboomlift: "elevator-up",
  machinestoolsequipmentsurveyingmeasuringinstruments: "tape-measure",
  machinestoolsequipmentwaterpump: "water-pump",
  machinestoolsequipmentweldingmachine: "flash-outline",
  machinestoolsequipmentother: "dots-horizontal-circle-outline",
  fashionaccessoriesaccessories: "sunglasses",
  fashionaccessoriesbottomwear: "hanger",
  fashionaccessoriescostumes: "drama-masks",
  fashionaccessoriesdresses: "human-female",
  fashionaccessoriesethnicwear: "tshirt-v-outline",
  fashionaccessoriesfootwear: "shoe-sneaker",
  fashionaccessorieshandbags: "purse-outline",
  fashionaccessoriesjewellery: "diamond-stone",
  fashionaccessorieswatches: "watch",
  fashionaccessorieskidswear: "human-child",
  fashionaccessoriessuitsblazers: "tie",
  fashionaccessorieswinterwear: "snowflake",
  fashionaccessoriesother: "dots-horizontal-circle-outline",
  artdecorhobbyhandicrafts: "scissors-cutting",
  artdecorhobbypaintings: "palette-outline",
  artdecorhobbypottery: "pot-outline",
  artdecorhobbysculptures: "palette-swatch-outline",
  artdecorhobbyrugs: "rug",
  artdecorhobbyplants: "sprout-outline",
  artdecorhobbysewingcraftmachine: "needle",
  artdecorhobbytelescopebinoculars: "telescope",
  artdecorhobbyother: "dots-horizontal-circle-outline",
  booksbiography: "book-account-outline",
  booksfiction: "book-open-page-variant-outline",
  bookskids: "book-alphabet",
  booksnonfiction: "book-open-variant",
  booksselfhelp: "head-lightbulb-outline",
  bookstextbookexamprep: "book-education-outline",
  booksother: "dots-horizontal-circle-outline",
  eventscelebrationspartysuppliesdecoration: "party-popper",
  eventscelebrationsbarricadecrowdcontrol: "fence",
  eventscelebrationscateringequipment: "silverware-fork-knife",
  eventscelebrationscrockerytableware: "silverware-variant",
  eventscelebrationseventlighting: "spotlight",
  eventscelebrationsexhibitiondisplay: "presentation",
  eventscelebrationsfogeffectsmachine: "weather-fog",
  eventscelebrationsmandapceremonydecor: "flower-outline",
  eventscelebrationspandalshamiana: "tent",
  eventscelebrationspartycasinogames: "cards-playing-outline",
  eventscelebrationspartyfoodmachines: "popcorn",
  eventscelebrationsstagetruss: "podium",
  eventscelebrationsportabletoiletshower: "toilet",
  eventscelebrationsweddingbaggicarriage: "horse",
  eventscelebrationsdanceflooreventflooring: "dance-ballroom",
  eventscelebrationsother: "dots-horizontal-circle-outline",
  babykidscribbabybed: "bed-single-outline",
  babykidsbabycarrier: "baby",
  babykidsbouncerwalkerplaygym: "baby-face-outline",
  babykidsbreastpumpfeeding: "baby-bottle-outline",
  babykidscarseat: "car-seat",
  babykidshighchair: "chair-school",
  babykidskidsfurniture: "bunk-bed-outline",
  babykidskidsplayequipment: "slide",
  babykidsrideontoy: "horse-variant",
  babykidsstroller: "baby-buggy",
  babykidstoys: "teddy-bear",
  babykidsother: "dots-horizontal-circle-outline",
  healthmedicalmedicalequipment: "stethoscope",
  healthmedicalmassageequipment: "spa-outline",
  healthmedicalmortuaryfreezerbox: "coffin",
  healthmedicalother: "dots-horizontal-circle-outline",
  traveloutdoorofficebackpacks: "bag-personal-outline",
  traveloutdoorofficeluggagesuitcases: "bag-suitcase-outline",
  traveloutdoorofficetravelgear: "bag-carry-on",
  traveloutdoorofficemountaineering: "image-filter-hdr",
  traveloutdoorofficecampinggear: "campfire",
  traveloutdoorofficepresentationconferencegear: "presentation",
  traveloutdoorofficesleepingbagmat: "sleep",
  traveloutdoorofficetentcanopy: "tent",
  traveloutdoorofficeother: "dots-horizontal-circle-outline",
};

type SubGlyph = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

/**
 * One component per glyph, built once. Creating these inside categoryIconFor
 * would hand React a new component type on every render and remount every tile.
 * strokeWidth is accepted and ignored: these glyphs have a fixed weight.
 */
const subComponents = new Map<string, IconComponent>();

function subIconFor(glyph: string): IconComponent {
  let Icon = subComponents.get(glyph);
  if (!Icon) {
    Icon = (({ size, color }: { size?: number | string; color?: string }) => (
      <MaterialCommunityIcons
        name={glyph as SubGlyph}
        size={Number(size ?? 24)}
        color={color}
      />
    )) as unknown as IconComponent;
    subComponents.set(glyph, Icon);
  }
  return Icon;
}

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
  const glyph = slug ? SUB_ICONS[keyOf(slug)] : undefined;
  if (glyph) return subIconFor(glyph);
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
