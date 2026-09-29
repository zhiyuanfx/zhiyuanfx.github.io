---
title: 'TurboQuant: Online Vector Quantization'
date: 2026-06-20
dateLabel: '20 Jun 2026'
keywords: ['TurboQuant', 'Vector Quantization', 'KV Cache', 'QJL']
highlight: 'Paper Notes'
---

## Introduction

Compressing a vector raises two different questions: how accurately can we reconstruct it, and how accurately can we estimate its dot product with another vector? TurboQuant addresses both through random transformations and low-bit quantization. The distinction matters for attention, where small reconstruction error alone does not guarantee unbiased dot products.

These notes walk through the construction in [“TurboQuant: Online Vector Quantization with Near-optimal Distortion Rate”](https://arxiv.org/abs/2504.19874): an MSE-oriented quantizer, a one-bit Quantized Johnson–Lindenstrauss (QJL) estimator, their combination for inner products, and deployment in a KV cache.

## Vector Quantization Motivation and Problem Definition

For a vector $x\in\mathbb{R}^d$, a quantizer with total budget $B=bd$ bits consists of an encoder and decoder

$$
Q:\mathbb{R}^d\rightarrow\{0,1\}^{B},
\qquad
Q^{-1}:\{0,1\}^{B}\rightarrow\mathbb{R}^d,
\tag{1}
$$

where $b$ is the average number of bits per coordinate. The notation $Q^{-1}$ denotes a decoder rather than a true mathematical inverse. The reconstructed vector

$$
\widehat{x}=Q^{-1}(Q(x))
\tag{2}
$$

is generally different from $x$ because the map is lossy.

TurboQuant considers two distortion objectives. The first is reconstruction mean-squared error (MSE):

<span id="eq:mse-objective"></span>

$$
D_{\mathrm{mse}}
:=
\mathbb{E}_Q\!\left[\left\|x-Q^{-1}(Q(x))\right\|_2^2\right].
\tag{3}
$$

This objective asks whether the complete vector can be reconstructed accurately.

The second objective is inner-product distortion with an arbitrary query vector $y\in\mathbb{R}^d$:

<span id="eq:prod-objective"></span>

$$
D_{\mathrm{prod}}
:=
\mathbb{E}_Q\!\left[
\left|
\langle y,x\rangle-
\left\langle y,Q^{-1}(Q(x))\right\rangle
\right|^2
\right].
\tag{4}
$$

For applications driven by dot products, TurboQuant additionally seeks an unbiased estimator:

<span id="eq:unbiased-objective"></span>

$$
\mathbb{E}_Q\!\left[
\left\langle y,Q^{-1}(Q(x))\right\rangle
\right]
=\langle y,x\rangle.
\tag{5}
$$

The expectations are taken over the random transformations used by the quantizer. We have two TurboQuant quantizers $Q_{\mathrm{mse}}$ and $Q_{\mathrm{prod}}$. $Q_{\mathrm{mse}}$ only minimizes $D_{\mathrm{mse}}$; $Q_{\mathrm{prod}}$ is an unbiased estimator for inner product and guarantees small $D_{\mathrm{prod}}$.

## MSE-Optimized TurboQuant

The first TurboQuant quantizer, denoted $Q_{\mathrm{mse}}$, only minimizes the MSE objective in Equation [(3)](#eq:mse-objective).

### Why Direct Scalar Quantization Is Difficult

The coordinates of a practical vector can be uneven: a few coordinates may have large magnitudes while most are small. A single scalar grid must then either cover a wide range with coarse spacing or clip large values. TurboQuant first changes the coordinate system so that the energy of the vector is spread more evenly.

### Step 1: Normalize onto the Unit Sphere

We assume

$$
x\in S^{d-1},
\qquad
\|x\|_2=1.
\tag{6}
$$

For a general nonzero vector $v$, the encoder may quantize $x=v/\|v\|_2$ and store the scalar norm $\|v\|_2$ separately. The norm is multiplied back into the decoded vector. This scalar metadata is not part of the $bd$ index bits and needs a marginally extra storage.

### Step 2: Generate and Apply a Random Rotation

TurboQuant generates an orthogonal matrix

$$
\Pi\in\mathbb{R}^{d\times d},
\qquad
\Pi^\top\Pi=I,
\tag{7}
$$

by applying a QR decomposition to a Gaussian random matrix. It then computes

<span id="eq:rotate"></span>

$$
y=\Pi x.
\tag{8}
$$

For any fixed unit vector $x$, randomness in $\Pi$ makes $\Pi x$ uniformly distributed on the unit sphere. Consequently, every coordinate $y_j$ has the same marginal density as a Beta distribution. Distinct coordinates remain constrained by $\sum_j y_j^2=1$, so they are not exactly independent. In high dimensions, however, small collections of coordinates become nearly independent. As $d$ grows, the density of each $y_j$ approaches $\mathcal{N}(0,1/d)$.

### Step 3: Construct a Codebook for $y$

For bit width $b$, the scalar codebook contains $2^b$ ordered centroids. Nearest-centroid assignment is a one-dimensional $k$-means problem. Given the normal distribution of $y_j$, we can apply the Max–Lloyd algorithm, which directly gives us a near-optimal codebook.

For example, the high-dimensional one-bit grid is

$$
\left\{-\sqrt{\frac{2}{\pi d}},
+\sqrt{\frac{2}{\pi d}}\right\},
\tag{9}
$$

and the approximate two-bit grid is

$$
\left\{
-\frac{1.51}{\sqrt d},
-\frac{0.453}{\sqrt d},
\frac{0.453}{\sqrt d},
\frac{1.51}{\sqrt d}
\right\}.
\tag{10}
$$

The levels are nonuniform because the rotated-coordinate density is concentrated near zero.

### Step 4: Encode by Rounding to Nearest Codeword

For each rotated coordinate $y_j$, the encoder stores

<span id="eq:nearest-centroid"></span>

$$
\operatorname{idx}_j
=
\arg\min_{k\in\{1,\ldots,2^b\}}
|y_j-c_k|.
\tag{11}
$$

Each coordinate requires $b$ bits, so the compressed vector requires $bd$ bits as targeted.

### Proof Message and Distortion Guarantee

$Q_{\mathrm{mse}}$ guarantees

$$
4^{-b}
\leq
D_{\mathrm{mse}}
\leq
\frac{\sqrt{3}\,\pi}{2}\,4^{-b}.
\tag{12}
$$

Every additional bit reduces the asymptotic distortion by a factor of approximately four. $Q_{\mathrm{mse}}$ distortion is provably within a factor of at most $\frac{\sqrt{3}\,\pi}{2} \approx 2.7$ of the theoretical lower bound. By experiment, when $b=1$, $Q_{\mathrm{mse}}$ achieves $1.45$.

### Practical Reuse and Entropy Coding

The codebook depends on the vector dimension and target bit width, $C=C(d,b)$. The shape of rotation $\Pi$ depend on $d$. Thus, both objects can be generated before inference, stored, and reused for every layers with the same vector dimension. No forward-pass data is needed.

The codeword indices are not uniformly distributed because central codewords are selected more frequently. They can therefore be entropy-coded without changing reconstruction error. TurboQuant notes that the gain is modest—approximately a $5\%$ reduction of memory in the cited four-bit example—and omits it to preserve simplicity.

## Why MSE Quantization Is Insufficient for Attention

Low MSE does not imply unbiased inner products. At one bit, $Q_{\mathrm{mse}}$ satisfies

<span id="eq:mse-bias"></span>

$$
\mathbb{E}\!\left[\langle y,\widehat{x}_{\mathrm{mse}}\rangle\right]
=
\frac{2}{\pi}\langle y,x\rangle.
\tag{13}
$$

Thus the one-bit MSE estimator systematically shrinks dot products by about $36\%$. The bias decreases as precision increases. TurboQuant therefore introduces a separate quantizer $Q_{\mathrm{prod}}$ whose primary goal is unbiased, low-variance inner-product estimation.

## QJL: One-Bit Vector Quantization

Quantized Johnson–Lindenstrauss (QJL) quantization represents a vector using signs of random projections. In TurboQuant it is used to encode a residual vector $r$, but it is useful to first view QJL as a standalone algorithm.

### Step 1: Generate Random Projection Directions

Generate a random Gaussian matrix

$$
S\in\mathbb{R}^{d\times d},
\qquad
S_{ij}\sim\mathcal{N}(0,1).
\tag{14}
$$

Each row $s_i^\top$ defines a random direction and a random hyperplane through the origin.

### Step 2: Store One Sign Bit per Projection

QJL encodes the residual as

<span id="eq:qjl-encode"></span>

$$
z=\operatorname{sign}(Sr)\in\{-1,+1\}^d.
\tag{15}
$$

The bit $z_i$ records which side of the hyperplane orthogonal to $s_i$ contains $r$. The encoder also stores the residual magnitude

$$
\gamma=\|r\|_2.
\tag{16}
$$


### Step 3: Decode the Directional Average

The residual estimate is

<span id="eq:qjl-decode"></span>

$$
\widehat{r}_{\mathrm{qjl}}
=
\frac{\sqrt{\pi/2}}{d}\,
\gamma S^\top z.
\tag{17}
$$

This expression is an average of random directions whose signs have been corrected using the target vector $r$.

### Geometric Intuition

Consider one Gaussian direction $s$ and a unit target direction $u=r/\|r\|_2$. Decompose

$$
s=g u+w,
\tag{18}
$$

where $g=s^\top u$ is the component parallel to $u$ and $w$ is perpendicular. Multiplication by the stored sign gives

$$
s\,\operatorname{sign}(s^\top u)
=
|g|u+w\,\operatorname{sign}(g).
\tag{19}
$$

The parallel component now always points toward $u$. The perpendicular component remains symmetric and cancels when many corrected directions are averaged. The mean magnitude of the surviving parallel component is $\sqrt{2/\pi}$, so the factor $\sqrt{\pi/2}$ in Equation [(17)](#eq:qjl-decode) restores the correct scale.

Consequently,

$$
\mathbb{E}[\widehat{r}_{\mathrm{qjl}}]=r
\tag{20}
$$

and, for any query $q$,

$$
\mathbb{E}\!\left[q^\top\widehat{r}_{\mathrm{qjl}}\right]
=q^\top r.
\tag{21}
$$

The inner-product variance decreases proportionally to $1/d$.

## Inner-Product-Optimized TurboQuant

TurboQuant combines $Q_{\mathrm{mse}}$ and $Q_{\mathrm{qjl}}$ into a $b$-bit inner-product quantizer $Q_{\mathrm{prod}}$. Most of the budget builds a low-MSE approximation, while the final bit per coordinate provides an unbiased residual correction.

### Step 1: Spend b–1 Bits on MSE Quantization

Instantiate MSE TurboQuant at bit width $b-1$ and compute

$$
\operatorname{idx}=Q_{\mathrm{mse}}(x),
\qquad
\widehat{x}_{\mathrm{mse}}=Q_{\mathrm{mse}}^{-1}(\operatorname{idx}).
\tag{22}
$$

This stage requires $(b-1)d$ index bits.

### Step 2: Form the Exact Coarse Residual

Compute

<span id="eq:residual"></span>

$$
r=x-\widehat{x}_{\mathrm{mse}}.
\tag{23}
$$

The MSE stage is designed to make $\|r\|_2$ small.

### Step 3: Spend One Bit on QJL

Encode the residual using

$$
z=\operatorname{sign}(Sr),
\qquad
\gamma=\|r\|_2.
\tag{24}
$$

The sign vector requires $d$ bits, bringing the nominal total to

$$
(b-1)d+d=bd
\tag{25}
$$

bits, plus the scalar residual norm.

### Step 4: Decode and Add the Two Components

The final reconstruction is

<span id="eq:prod-decode"></span>

$$
\widehat{x}
=
\widehat{x}_{\mathrm{mse}}
+
\widehat{r}_{\mathrm{qjl}}.
\tag{26}
$$

At total bit width $b=1$, the coarse stage has zero bits and the construction reduces to QJL applied directly to $x$.

### Proof Message and Distortion Guarantee

Conditioned on any coarse reconstruction, QJL returns the exact residual in expectation. $Q_{\mathrm{prod}}$ therefore guarantees

$$
\mathbb{E}[\widehat{x}]=x,\ \mathbb{E}_Q\!\left[
\left\langle y,\widehat{x}\right\rangle
\right]
=\langle y,x\rangle.
\tag{27}
$$

and

$$
\frac{1}{d}\, \frac{1}{4^b}
\leq \mathbb{E}_Q\!\left[
\left|
\langle y,x\rangle-
\left\langle y,\widehat{x}\right\rangle
\right|^2
\right]
\leq \frac{\sqrt{3}\pi^2\|y\|_2^2}{d}\,\frac{1}{4^b}.
\tag{28}
$$


## KV-Cache Deployment

### Streaming Quantization

A TurboQuant instance can be initialized before any forward pass because its codebook and random transforms do not require calibration data. A newly produced vector is encoded and stored immediately as compressed.

### Outlier Channels and Mixed Precision

Practical KV caches can contain channels whose magnitudes remain unusually large across many prompt tokens, especially in deeper layers. These persistent channels contribute disproportionately to quantization error. For better results, TurboQuant paper handles outlier and normal channels by two independent quantizers with different precision. Each subvector has its own dimension, random transforms, and codebook.

For a 128-dimensional head, the reported 2.5-bit configuration assigns 32 channels three bits and 96 channels two bits. This means a $32\times32$ rotation and a codebook $C(32,3)$ for the outlier subvector, and a $96\times96$ rotation with $C(96,2)$ for the normal subvector.

## Conclusion

TurboQuant separates accurate reconstruction from unbiased inner-product estimation. Random rotation makes a reusable scalar codebook effective for the first objective; QJL supplies an unbiased correction for the residual in the second. Together, these components connect a compact bit budget to the two distortion objectives introduced at the start of the note.

The deployment picture follows the same construction: prepare the transforms and codebooks in advance, encode vectors as they arrive, and use separate quantizers when outlier channels need different precision. The central idea is a small set of reusable operations that supports both vector compression and dot-product estimation.

## References

1. Amir Zandieh, Majid Daliri, Majid Hadian, and Vahab Mirrokni. “TurboQuant: Online Vector Quantization with Near-optimal Distortion Rate.” *arXiv preprint arXiv:2504.19874*, 2025. [Read on arXiv](https://arxiv.org/abs/2504.19874).
