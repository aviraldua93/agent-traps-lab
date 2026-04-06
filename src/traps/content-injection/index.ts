/**
 * Trap Category 1: Content Injection Traps
 *
 * Four sub-scenarios covering different vectors for embedding adversarial
 * instructions into content that an AI agent processes:
 *
 *   1a  CSS-Invisible Text    — instructions hidden via CSS (display:none, etc.)
 *   1b  HTML Comment Injection — instructions inside <!-- HTML comments -->
 *   1c  Image Metadata         — instructions in EXIF/XMP metadata fields
 *   1d  Dynamic Cloaking       — different content served to bots vs humans
 *
 * Paper reference: §3.1 Content Injection Traps
 */

export { cssInvisibleTrap, htmlCommentTrap } from './css-invisible.js';
export { imageMetadataTrap } from './image-metadata.js';
export { dynamicCloakingTrap } from './dynamic-cloaking.js';
