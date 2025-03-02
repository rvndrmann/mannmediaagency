const validImageSizes = [
  "square_hd",
  "square",
  "portrait_4_3",
  "portrait_16_9",
  "landscape_4_3",
  "landscape_16_9"
];

// Validate the image size
if (!validImageSizes.includes(imageSize)) {
  return new Response(
    JSON.stringify({
      error: `Invalid image size. Valid options are: ${validImageSizes.join(', ')}`,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    }
  );
}
