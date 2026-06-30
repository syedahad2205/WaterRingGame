// water.glsl — Skia RuntimeEffect shader for the water body (Layer 1)
//
// Compiled to Metal (iOS) and Vulkan/OpenGL ES (Android) via Skia's shader
// pipeline.  All parameters are passed as uniforms — no texture samples.
//
// Design.md specification:
//   - Vertical gradient: darker at bottom, lighter near surface.
//   - Caustic shimmer: scrolling sin/cos pattern simulating light refraction.
//   - Specular highlight streak near the surface.
//   - NO branching — all conditionals use step() / smoothstep() to stay
//     branch-free on mobile GPU (design.md: "no if/else in shader code").
//
// Uniforms:
//   time          — elapsed seconds (drives animation)
//   brightness    — base brightness multiplier  (0.0–1.0, default 1.0)
//   causticSpeed  — scroll speed for caustic pattern (default 0.3)
//   tint          — RGB colour tint for the water body
//
// Requirements: 41.3, 41.4, 41.5

uniform float time;
uniform float brightness;
uniform float causticSpeed;
uniform float3 tint;

// ---------------------------------------------------------------------------
// Entry point — called per fragment by Skia's RuntimeEffect
// ---------------------------------------------------------------------------
half4 main(float2 fragCoord) {

    // -----------------------------------------------------------------------
    // Normalised UV coordinates.
    // Skia provides fragCoord in canvas pixels from the top-left.
    // We normalise to [0,1] × [0,1].
    // Because we don't have resolution as a uniform here, we derive from
    // the path bounding box implicitly — shaders in Skia RuntimeEffect work
    // in local-space coordinates.  The renderer sets the canvas size so
    // fragCoord.xy ranges across (0..width, 0..height).
    // To keep the shader self-contained we use un-normalised coordinates and
    // scale by hand.  We assume a nominal 1000×1000 space and let Skia scale.
    // -----------------------------------------------------------------------

    float2 uv = fragCoord / 1000.0; // normalise to ~[0,1] (scaled by canvas)

    // -----------------------------------------------------------------------
    // 1. Vertical gradient — dark bottom, lighter near surface (top)
    //
    // uv.y = 0 at the top (surface), 1 at the bottom.
    // gradientFactor goes from 1.0 (bright, at top) to 0.4 (dark, at bottom).
    // No branching: pure arithmetic mix.
    // -----------------------------------------------------------------------
    float gradientFactor = mix(1.0, 0.4, uv.y);

    // -----------------------------------------------------------------------
    // 2. Caustic shimmer — scrolling interference pattern
    //
    // Real-water caustics are complex, but a two-layer scrolling sin/cos
    // approximation is visually convincing and branch-free.
    //
    // Pattern = sin(freq * (uv.x + scroll)) + cos(freq * (uv.y + scroll))
    // normalised to [0, 1] for safe blending.
    // -----------------------------------------------------------------------
    float scroll = time * causticSpeed;
    float causticFreq = 8.0;

    float causticA = sin(causticFreq * (uv.x + scroll)        ) *
                     cos(causticFreq * (uv.y + scroll * 0.7)  );
    float causticB = sin(causticFreq * (uv.x - scroll * 0.5)  ) *
                     cos(causticFreq * (uv.y + scroll * 1.3)  );

    // Combine and normalise from [-1,1] to [0,1].
    float caustic = (causticA + causticB) * 0.25 + 0.5; // 0.25 = 0.5/2 (two terms)

    // Caustics are strongest deep in the water, fade near surface.
    float causticDepthScale = uv.y; // 0 at surface, 1 at bottom
    float causticContrib = caustic * causticDepthScale * 0.18; // 0.18 = intensity cap

    // -----------------------------------------------------------------------
    // 3. Specular highlight streak near the water surface
    //
    // A horizontal band of slightly increased brightness just below the top
    // simulates light bouncing off the surface layer.
    //
    // smoothstep(edge0, edge1, x) gives a smooth 0→1 transition — branch-free.
    // The highlight fades from the surface downward over the top 10% of height.
    // A slight horizontal oscillation makes it look like a moving reflection.
    // -----------------------------------------------------------------------
    float specularOscillation = sin(time * 0.8 + uv.x * 3.0) * 0.05;
    float specularBand = smoothstep(0.0, 0.10 + specularOscillation, uv.y);
    // specularBand = 0 exactly at surface (uv.y=0), 1 below the highlight zone.
    // We INVERT it so 1 = bright at surface, 0 = nothing below the zone.
    float specularContrib = (1.0 - specularBand) * 0.25;

    // -----------------------------------------------------------------------
    // 4. Compose final colour
    //
    // base colour = tint × gradientFactor × brightness
    // then add caustic and specular on top (all additive, no branching).
    // -----------------------------------------------------------------------
    float3 colour = tint * gradientFactor * brightness;
    colour += causticContrib;       // caustic shimmer
    colour += specularContrib;      // surface highlight

    // Clamp to valid [0,1] range.
    colour = clamp(colour, 0.0, 1.0);

    // Full opacity — the water is opaque.
    return half4(half3(colour), 1.0);
}
