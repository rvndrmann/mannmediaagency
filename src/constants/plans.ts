
export const PLANS = [
  {
    name: "BASIC",
    credits: "10 Credits",
    videos: "1 video",
    price: 299,
    billing: "One-time payment",
    features: [
      "Create 1 video (10 credits)",
      "AI Agent: 1 credit per 1000 words",
      "Background Music",
      "No Watermark",
      "HD Video Resolution"
    ]
  },
  {
    name: "PRO",
    credits: "100 Credits",
    videos: "10 videos",
    price: 2499,
    billing: "One-time payment",
    features: [
      "Create 10 videos (10 credits each)",
      "AI Agent: 1 credit per 1000 words",
      "Background Music",
      "No Watermark",
      "HD Video Resolution",
      "Priority Support"
    ]
  }
] as const;
