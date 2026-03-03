/** Tier badge configuration — shared between client and server */

export type TierBadge = {
  tier: number;
  name: string;
  image: string;       // 256px badge
  imageSm: string;     // 128px badge for leaderboard
  color: string;       // Tailwind text color class
  bgColor: string;     // Tailwind bg color class for accent
  borderColor: string; // Tailwind border color class
};

export const TIER_BADGES: TierBadge[] = [
  {
    tier: 1,
    name: "Circuit Initiate",
    image: "/badges/tier_1_circuit_initiate.png",
    imageSm: "/badges/tier_1_circuit_initiate_sm.png",
    color: "text-sky-400",
    bgColor: "bg-sky-500/20",
    borderColor: "border-sky-500/30",
  },
  {
    tier: 2,
    name: "Data Weaver",
    image: "/badges/tier_2_data_weaver.png",
    imageSm: "/badges/tier_2_data_weaver_sm.png",
    color: "text-teal-400",
    bgColor: "bg-teal-500/20",
    borderColor: "border-teal-500/30",
  },
  {
    tier: 3,
    name: "Neural Architect",
    image: "/badges/tier_3_neural_architect.png",
    imageSm: "/badges/tier_3_neural_architect_sm.png",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/30",
  },
  {
    tier: 4,
    name: "Algorithm Sentinel",
    image: "/badges/tier_4_algorithm_sentinel.png",
    imageSm: "/badges/tier_4_algorithm_sentinel_sm.png",
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    borderColor: "border-purple-500/30",
  },
  {
    tier: 5,
    name: "Quantum Sage",
    image: "/badges/tier_5_quantum_sage.png",
    imageSm: "/badges/tier_5_quantum_sage_sm.png",
    color: "text-violet-400",
    bgColor: "bg-violet-500/20",
    borderColor: "border-violet-500/30",
  },
  {
    tier: 6,
    name: "Singularity Vanguard",
    image: "/badges/tier_6_singularity_vanguard.png",
    imageSm: "/badges/tier_6_singularity_vanguard_sm.png",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    borderColor: "border-amber-500/30",
  },
  {
    tier: 7,
    name: "Omniscient Apex",
    image: "/badges/tier_7_omniscient_apex.png",
    imageSm: "/badges/tier_7_omniscient_apex_sm.png",
    color: "text-rose-400",
    bgColor: "bg-rose-500/20",
    borderColor: "border-rose-500/30",
  },
];

export function getTierBadge(tier: number): TierBadge {
  return TIER_BADGES[Math.max(0, Math.min(tier - 1, TIER_BADGES.length - 1))];
}
