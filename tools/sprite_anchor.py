"""Foot anchors keep a weapon's changing bounds from moving the wrestler's body."""
import numpy as np

def frame_anchor(image, animation):
    width, height = image.size
    anchor_x = width / 2
    if animation not in ('down', 'jump', 'pin') and width < height * 1.6:
        alpha = np.array(image.getchannel('A'))
        # Use the occupied sole band; ignore faint JPEG-mask fringes and isolated dust.
        band = alpha[max(0, height - max(7, round(height * .07))):]
        xs = np.where(band > 180)[1]
        if len(xs) > 8:
            anchor_x = float(np.mean(np.quantile(xs, [.05, .95])))
    return {'anchorX': round(anchor_x, 2), 'anchorY': height}
