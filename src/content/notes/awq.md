---
title: 'AWQ: Activation-Aware Weight Quantization'
date: 2026-06-01
keywords: ['AWQ', 'GPTQ', 'Quantization']
highlight: 'Paper Notes'
---

Can we shrink a large language model’s weights to 3 or 4 bits without retraining it? Rounding every weight to the nearest point on a coarse grid works at 8 bits but breaks down below that. Two widely used methods take opposite routes around the problem.

[“GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers”](https://arxiv.org/abs/2210.17323) works after rounding: each time it rounds a weight, it adjusts the weights that remain so that the layer’s output on calibration data barely changes. [“AWQ: Activation-aware Weight Quantization for On-Device LLM Compression and Acceleration”](https://arxiv.org/abs/2306.00978) works before rounding: it uses only a simple summary of the calibration data to decide which weights need protecting, then rescales them so that ordinary rounding treats them gently. These notes introduce the quantization problem, walk through GPTQ as the standard baseline, and then focus on AWQ.

## Why quantize LLM weights

Large models are expensive to store before they are expensive to run. GPT-3 has 175 billion parameters, which occupy about 326 GB in FP16—more memory than any single GPU provides. Serving such a model means splitting it across several GPUs, and even much smaller models strain laptops and edge devices.

Memory also limits speed. During generation, a model produces one token at a time, so each linear layer multiplies its weight matrix by a single activation vector. Every two-byte FP16 weight loaded from memory is used for one multiply–add, an arithmetic intensity of about 1 FLOP per byte. AWQ profiles a 7B Llama model on an RTX 4090, which needs about 165 FLOPs per byte before computation becomes the bottleneck. Generation therefore spends most of its time waiting for weights: processing a 200-token prompt takes 10 ms, while generating 20 tokens takes 310 ms. Weights also account for far more memory traffic than activations.

Storing weights in 4 bits cuts that traffic by about four times and raises the arithmetic intensity to about 4 FLOPs per byte. This is why both papers study **weight-only quantization**: weights are stored as low-bit integers, while activations stay in FP16. The setting is often written W4A16, or W3A16 for 3-bit weights.

There are two broad ways to obtain quantized weights. **Quantization-aware training (QAT)** continues training while simulating rounding in the forward pass, passing approximate gradients through the rounding step. It can be accurate, but retraining a model with billions of parameters is expensive. **Post-training quantization (PTQ)** starts from a trained model and quantizes it once, using at most a small calibration set and a few GPU-hours. GPTQ and AWQ are both PTQ methods.

## Quantization basics

### The quantizer

A $b$-bit quantizer maps real numbers onto $2^b$ evenly spaced levels. For a group of weights $w_1,\ldots,w_n$, the common asymmetric version uses a **scale** $\Delta$ and an integer **zero point** $z$:

$$
\Delta=\frac{\max_i w_i-\min_i w_i}{2^b-1},
\qquad
z=\operatorname{round}\!\left(-\frac{\min_i w_i}{\Delta}\right).
\tag{1}
$$

Each weight is stored as an integer $q_i$ and reconstructed as $\operatorname{quant}(w_i)$:

$$
q_i=\operatorname{clamp}\!\left(\operatorname{round}\!\left(\frac{w_i}{\Delta}\right)+z,\ 0,\ 2^b-1\right),
\qquad
\operatorname{quant}(w_i)=\Delta\,(q_i-z).
\tag{2}
$$

Only the integers, plus one $\Delta$ and one $z$ per group, are stored. The rounding error of each weight is at most $\Delta/2$, so a group with a wide range of values receives a coarse grid.

### Granularity

The group can be an entire weight matrix (per-tensor), one output row (per-channel), or a run of $g$ consecutive weights within a row (per-group). Smaller groups fit the grid to local ranges, at the cost of storing more scales and zero points. With $g=128$, the overhead is about 0.15 extra bits per weight. GPTQ’s main experiments use one grid per row; AWQ uses $g=128$ throughout.

### Round-to-nearest

The simplest method, **round-to-nearest (RTN)**, applies Equation (2) to every weight independently. It works well at 8 bits and reasonably at 4 bits for some models, but it can fail abruptly at lower precision. In GPTQ’s experiments with per-row grids, OPT-175B has a WikiText-2 perplexity of 8.34 in FP16, 10.54 with 4-bit RTN, and about 7,300 with 3-bit RTN.

### The layer-wise objective

RTN treats every weight in isolation, but the model only cares about the outputs it produces. Accurate PTQ methods therefore quantize one linear layer at a time and measure error at that layer’s output. Let $W\in\mathbb{R}^{d_{\mathrm{row}}\times d_{\mathrm{col}}}$ be the weight matrix and let $X\in\mathbb{R}^{d_{\mathrm{col}}\times N}$ collect the layer’s inputs over $N$ calibration tokens. The goal is

<span id="eq:layer-objective"></span>

$$
\widehat W=\arg\min_{\widehat W}\ \left\|WX-\widehat WX\right\|_F^2,
\tag{3}
$$

where every entry of $\widehat W$ must lie on its quantization grid. The columns of $W$ correspond to **input channels**, and its rows to output channels.

The squared Frobenius norm separates into one problem per row. Writing a row as a column vector $w\in\mathbb{R}^{d_{\mathrm{col}}}$ and its quantized version as $\widehat w$,

<span id="eq:row-quadratic"></span>

$$
\left\|w^\top X-\widehat w^\top X\right\|_2^2
=\frac12\,(w-\widehat w)^\top H\,(w-\widehat w),
\qquad
H=2XX^\top.
\tag{4}
$$

$H$ is the Hessian of the row loss. It depends only on the inputs, so every row of $W$ shares it.

Equation [(4)](#eq:row-quadratic) shows why RTN falls short. RTN minimizes $\|w-\widehat w\|_2^2$, which would be the right objective only if $H$ were a multiple of the identity. In practice, input channels are correlated, so $H$ has large off-diagonal entries. The output error caused by rounding one weight can then be partly cancelled by adjusting other weights in the same row. Exploiting this cancellation is the core idea of GPTQ.

## GPTQ: error compensation at scale

GPTQ approximately solves Equation [(3)](#eq:layer-objective) for models with hundreds of billions of parameters. It descends from two earlier methods: Optimal Brain Surgeon for pruning and Optimal Brain Quantization for quantization.

### From OBS to OBQ

**Optimal Brain Surgeon (OBS)** (Hassibi et al., 1993) removes one weight from a network and adjusts the remaining weights to compensate, using second-order information about the loss. **Optimal Brain Quantization (OBQ)** (Frantar et al., 2022) applies the same idea to quantization: instead of setting a weight to zero, it moves the weight onto its grid.

Consider one row $w$, and let $F$ denote the set of weights that are still unquantized, with Hessian $H_F=2X_FX_F^\top$ restricted to those weights. Quantizing weight $q\in F$ fixes its change to $\operatorname{quant}(w_q)-w_q$, while every other weight in $F$ may move to absorb the error. The best adjustment $\delta$ solves

$$
\min_{\delta}\ \frac12\,\delta^\top H_F\,\delta
\qquad\text{subject to}\qquad
e_q^\top\delta=\operatorname{quant}(w_q)-w_q,
\tag{5}
$$

where $e_q$ is the $q$-th standard basis vector. Setting the gradient of the Lagrangian to zero gives $H_F\delta=-\mu e_q$ for a multiplier $\mu$, so $\delta$ is proportional to the $q$-th column of $H_F^{-1}$. The constraint fixes the scale:

<span id="eq:obq-update"></span>

$$
\delta_F=-\frac{w_q-\operatorname{quant}(w_q)}{\left[H_F^{-1}\right]_{qq}}\,\left(H_F^{-1}\right)_{:,q}.
\tag{6}
$$

Substituting back, quantizing weight $q$ increases the row loss by $\frac12\left(\operatorname{quant}(w_q)-w_q\right)^2/\left[H_F^{-1}\right]_{qq}$. OBQ greedily picks the weight with the smallest increase,

$$
q=\arg\min_{q\in F}\ \frac{\left(\operatorname{quant}(w_q)-w_q\right)^2}{\left[H_F^{-1}\right]_{qq}},
\tag{7}
$$

applies Equation [(6)](#eq:obq-update), removes $q$ from $F$, and repeats until the row is quantized.

Removing $q$ from $F$ deletes the corresponding row and column of $H_F$. Rather than recomputing the inverse from scratch, OBQ obtains the inverse of the reduced matrix with one step of Gaussian elimination:

<span id="eq:inverse-update"></span>

$$
H_{F\setminus\{q\}}^{-1}
=\left(H_F^{-1}-\frac{1}{\left[H_F^{-1}\right]_{qq}}\left(H_F^{-1}\right)_{:,q}\left(H_F^{-1}\right)_{q,:}\right)_{-q},
\tag{8}
$$

where the subscript $-q$ removes row and column $q$.

**The quadratic is exact here.** OBS used a second-order Taylor approximation of a network’s loss around a trained minimum. The layer-wise loss in Equation [(4)](#eq:row-quadratic) is exactly quadratic. It is zero at the original weights, and after each update, Equation [(6)](#eq:obq-update) leaves the unquantized weights at the exact minimizer given the quantized ones. Each step is therefore optimal; only the order of rounding decisions is greedy.

OBQ is accurate but expensive. Each row is quantized in its own greedy order, so each row needs its own sequence of inverse updates. For a $d_{\mathrm{row}}\times d_{\mathrm{col}}$ matrix, the cost is $O(d_{\mathrm{row}}\cdot d_{\mathrm{col}}^3)$. OBQ quantizes ResNet-50 in about an hour on one GPU, but the same cost is prohibitive for language models with billions of parameters.

### Step 1: any order works

GPTQ’s first observation is that the greedy order matters little on large layers: quantizing weights in an arbitrary fixed order gives a final error close to OBQ’s. The paper’s explanation is that the greedy order postpones weights with large individual errors, which are then quantized near the end, when few unquantized weights remain to compensate for them.

GPTQ therefore quantizes **columns from left to right, in the same order for every row**. Since $H_F$ depends only on the inputs, every row has the same set $F$ and the same inverse $H_F^{-1}$ at every step. The inverse update in Equation [(8)](#eq:inverse-update) runs once per column instead of once per weight, which reduces the cost to $O(\max\{d_{\mathrm{row}}\cdot d_{\mathrm{col}}^2,\ d_{\mathrm{col}}^3\})$—a saving of a factor of $\min\{d_{\mathrm{row}},d_{\mathrm{col}}\}$.

### Step 2: lazy batch updates

A direct implementation is still slow on GPUs. After each column, Equations (6) and (8) update large matrices using only a few FLOPs per entry, so the computation is limited by memory bandwidth rather than arithmetic.

The fix uses the fact that the rounding of column $i$ depends only on the updates applied to column $i$; updates to later columns can wait. GPTQ processes blocks of $B=128$ columns. Inside a block, it applies updates only to the block’s own columns. After the block, it applies all accumulated updates to the remaining columns at once. For a set $Q$ of quantized indices, the batched versions of Equations (6) and (8) are

$$
\delta_F=-\left(H_F^{-1}\right)_{:,Q}\left(\left[H_F^{-1}\right]_{QQ}\right)^{-1}\left(w_Q-\operatorname{quant}(w_Q)\right),
\tag{9}
$$

$$
H_{F\setminus Q}^{-1}=\left(H_F^{-1}-\left(H_F^{-1}\right)_{:,Q}\left(\left[H_F^{-1}\right]_{QQ}\right)^{-1}\left(H_F^{-1}\right)_{Q,:}\right)_{-Q}.
\tag{10}
$$

The total arithmetic is unchanged, but the global update becomes a large matrix multiplication, which GPUs execute efficiently. GPTQ reports an order-of-magnitude speedup on very large models from this change alone.

### Step 3: Cholesky reformulation

At the scale of billions of parameters, repeated applications of Equation (10) accumulate numerical error. $H_F^{-1}$ can become indefinite, after which the updates push the remaining weights in wrong directions and can ruin a layer. For models beyond a few billion parameters, GPTQ found that this almost always happens in at least a few layers.

GPTQ combines two fixes. The first is **dampening**: it adds $\lambda I$ to $H$, with $\lambda$ equal to 1% of the average diagonal entry. The second removes the repeated inverse updates altogether. When column $q$ is quantized, with $F_q=\{q,q+1,\ldots,d_{\mathrm{col}}\}$ still unquantized, the algorithm only needs row $q$ of $H_{F_q}^{-1}$, from the diagonal onward. Those rows are, up to a scale, exactly the rows of the upper Cholesky factor $U$ of the full inverse, $H^{-1}=U^\top U$:

<span id="eq:cholesky-row"></span>

$$
U_{qj}=\frac{\left[H_{F_q}^{-1}\right]_{qj}}{\sqrt{\left[H_{F_q}^{-1}\right]_{qq}}},
\qquad j\ge q.
\tag{11}
$$

GPTQ therefore computes $U$ once, before quantization, with a numerically stable Cholesky routine. Together with mild dampening, this makes the method robust on the largest models, and the optimized Cholesky kernel is faster as well.

### The algorithm

<figure class="awq-figure awq-figure-narrow">
  <a href="/images/awq/gptq-figure-2.png" target="_blank" rel="noreferrer"><img src="/images/awq/gptq-figure-2.png" alt="Figure 2 from the GPTQ paper. Left: the upper-triangular Cholesky factor of the inverse layer Hessian, computed initially, with the rows for the current block outlined. Right: the weight matrix, where earlier columns are quantized, the current block is quantized column by column, and later columns are unquantized weights that are updated." width="1182" height="978" loading="lazy" /></a>
  <figcaption>Figure 2 from Frantar et al. (2023). The weight matrix (right) is quantized one block of columns at a time. Inside the outlined block, columns are quantized one by one; the white column is being quantized now. Orange columns are already quantized, and blue columns are unquantized weights that receive updates. The Cholesky factor (left) is computed once at the start, and its rows supply each column’s update. Source: <a href="https://arxiv.org/abs/2210.17323">arXiv:2210.17323</a>, CC BY 4.0.</figcaption>
</figure>

The full procedure, with the Cholesky factor written as $U$:

<pre class="awq-algorithm"><code>Input: weights W (d_row × d_col), Hessian H = 2XXᵀ, block size B = 128
U ← upper Cholesky factor of (H + λI)⁻¹                       # computed once

for i = 0, B, 2B, …                                           # block of columns i … i+B−1
    for j = i, …, i+B−1
        Q[:, j]      ← quant(W[:, j])                         # round column j in every row
        E[:, j−i]    ← (W[:, j] − Q[:, j]) / U[j, j]          # scaled rounding error
        W[:, j:i+B]  ← W[:, j:i+B] − E[:, j−i] · U[j, j:i+B]  # compensate inside the block
    W[:, i+B:]       ← W[:, i+B:] − E · U[i:i+B, i+B:]        # one lazy update for later columns

return Q</code></pre>

Slices exclude their end index, as in Python, and products of a column with a row are outer products. Each row of $W$ is still its own problem from Equation [(4)](#eq:row-quadratic); the algorithm processes all rows of a column together only because they share $U$.

A note on notation: Algorithm 1 in the paper overwrites $H^{-1}$ with its Cholesky factor and keeps the same symbol. Its $[H^{-1}]_{jj}$ is therefore $U_{jj}$, the square root of the denominator in Equation [(6)](#eq:obq-update), not the denominator itself. By Equation [(11)](#eq:cholesky-row), the two square roots recombine into exactly the OBQ update:

$$
\frac{w_q-\operatorname{quant}(w_q)}{U_{qq}}\,U_{qj}
=\frac{w_q-\operatorname{quant}(w_q)}{\left[H_{F_q}^{-1}\right]_{qq}}\,\left[H_{F_q}^{-1}\right]_{qj}.
\tag{12}
$$

### GPTQ in practice

GPTQ calibrates on 128 random segments of 2,048 tokens from C4, a corpus of web text, so it sees no task-specific data. It uses one asymmetric grid per row. To keep memory low, it loads one transformer block at a time, accumulates $H$ for each of the block’s linear layers, and quantizes them. It then passes the calibration inputs through the *quantized* block to obtain the inputs of the next block. Later layers are therefore calibrated on activations from the already-quantized part of the model.

On OPT-175B, the paper reports the following results. **Bold** marks the better quantized method at each bit width. The C4 perplexities are not fully held out, because the calibration data also comes from C4.

| Method | Bits | WikiText-2 PPL ↓ | PTB PPL ↓ | C4 PPL ↓ | LAMBADA accuracy ↑ |
| --- | ---: | ---: | ---: | ---: | ---: |
| FP16 | 16 | 8.34 | 12.01 | 10.13 | 75.59 |
| RTN | 4 | 10.54 | 14.22 | 11.61 | 71.34 |
| GPTQ | 4 | **8.37** | **12.26** | **10.28** | **76.80** |
| RTN | 3 | 7.3e3 | 8.0e3 | 4.6e3 | 0 |
| GPTQ | 3 | **8.68** | **12.68** | **10.67** | **76.19** |

Quantizing all of OPT-175B takes about 4.2 hours on a single NVIDIA A100. At 3 bits, the model needs about 63 GB and fits on one 80 GB A100, where FP16 inference needs five. Because its kernels load far fewer bytes per weight, the 3-bit model also generates tokens about 3.25 times faster than the FP16 version.

## Where GPTQ falls short

GPTQ’s strength is also its main weakness. Its compensation updates adjust nearly every weight using $H$, a statistic estimated from the calibration set. Each update hides a rounding error in directions where the calibration inputs barely vary, so the error costs almost nothing on that data. Inputs from another domain may vary in exactly those directions. GPTQ can therefore fit its calibration distribution closely, and it is prone to overfitting it.

The statistic is also expensive to estimate. GPTQ needs a full $d_{\mathrm{col}}\times d_{\mathrm{col}}$ input-correlation matrix, which it then inverts. A method that relied only on a vector of per-channel averages would need far less data. AWQ is built around that idea.

## AWQ: protecting the salient 1%

AWQ starts from an empirical observation about which weights matter, then turns it into a quantization method that keeps every weight in low precision.

### Not all weights are equal

The paper quantizes OPT-6.7B to 3 bits with groups of 128, but keeps 1% of the input channels—1% of the columns of $W$—in FP16. Which channels are kept makes a large difference:

| Configuration | WikiText-2 PPL ↓ |
| --- | ---: |
| FP16 | 10.86 |
| RTN, all channels in INT3 | 23.54 |
| 1% of channels in FP16, chosen by activation magnitude | **11.39** |
| 1% of channels in FP16, chosen by weight magnitude | 22.37 |
| 1% of channels in FP16, chosen at random | 24.23 |

Protecting the right 1% recovers nearly all of the lost perplexity. Choosing channels by weight magnitude, the usual measure of importance in pruning, barely improves on RTN, and a random choice does not help at all.

The intuition is that although only the weights are quantized, the activations determine which weights matter. An input channel that carries large activations feeds important features into the layer, so the weights reading from that channel are salient. Equation [(4)](#eq:row-quadratic) points the same way: for a single input $x$, the output error contributed by weight $j$ is $(w_j-\widehat w_j)\,x_j$, so the same rounding error costs more on a channel where $|x_j|$ is large.

### Why mixed precision is not the answer

Keeping 1% of the channels in FP16 works, but it produces a mixed-precision weight matrix: most entries are low-bit integers, while a few columns are FP16. Hardware and kernels are built around uniform data types and regular memory access, so such a layout runs inefficiently. AWQ instead looks for a way to protect the salient channels while storing every weight in the same low-bit format.

### Scaling instead of keeping FP16

The key tool is an exact equivalence. For any positive per-channel scales $s\in\mathbb{R}^{d_{\mathrm{col}}}$,

$$
WX=\left(W\operatorname{diag}(s)\right)\left(\operatorname{diag}(s)^{-1}X\right).
\tag{13}
$$

Scaling up a column of $W$ while scaling down the matching input channel leaves the layer’s output unchanged. Quantization breaks this symmetry: AWQ quantizes the scaled weights $W\operatorname{diag}(s)$, and the scales change how much rounding error each channel receives.

To see the effect, AWQ analyzes a symmetric quantizer whose step size is set by the largest magnitude in the group $\mathbf w$:

$$
Q(\mathbf w)=\Delta\cdot\operatorname{Round}\!\left(\frac{\mathbf w}{\Delta}\right),
\qquad
\Delta=\frac{\max|\mathbf w|}{2^{b-1}}.
\tag{14}
$$

Take one weight $w$ in the group, with input $x$. Multiplying the weight by $s>1$ and dividing the input by $s$ gives

$$
Q(w\cdot s)\cdot\frac{x}{s}
=\Delta'\cdot\operatorname{Round}\!\left(\frac{ws}{\Delta'}\right)\cdot\frac{x}{s},
\tag{15}
$$

where $\Delta'$ is the step size of the scaled group. Writing $\operatorname{RoundErr}(\cdot)$ for the rounding error in grid units, the two output errors are

$$
\begin{aligned}
\operatorname{Err}\!\left(Q(w)\,x\right)
&=\Delta\cdot\operatorname{RoundErr}\!\left(\frac{w}{\Delta}\right)\cdot x,\\
\operatorname{Err}\!\left(Q(w\cdot s)\,\frac{x}{s}\right)
&=\Delta'\cdot\operatorname{RoundErr}\!\left(\frac{ws}{\Delta'}\right)\cdot x\cdot\frac{1}{s}.
\end{aligned}
\tag{16}
$$

AWQ makes two empirical observations. First, rounding error is roughly uniform between 0 and 0.5 grid units, so its average is about 0.25 whether or not the weight is scaled. Second, scaling a single weight rarely changes the group’s maximum, so $\Delta'\approx\Delta$. The ratio of the new error to the old one is then

<span id="eq:error-ratio"></span>

$$
\frac{\Delta'}{\Delta}\cdot\frac1s\approx\frac1s<1.
\tag{17}
$$

Scaling up a salient channel therefore reduces its relative error without storing it in higher precision.

The approximation $\Delta'\approx\Delta$ only holds for moderate $s$. Scaling the 1% salient channels of OPT-6.7B (INT3, $g=128$) by a fixed $s$ gives:

| | $s=1$ | $s=1.25$ | $s=1.5$ | $s=2$ | $s=4$ |
| --- | ---: | ---: | ---: | ---: | ---: |
| Groups whose step size changes | 0% | 2.8% | 4.4% | 8.2% | 21.2% |
| Average $\Delta'/\Delta$ | 1 | 1.005 | 1.013 | 1.038 | 1.213 |
| Average $\frac{\Delta'}{\Delta}\cdot\frac1s$ | 1 | 0.804 | 0.676 | 0.519 | 0.303 |
| WikiText-2 PPL ↓ | 23.54 | 12.87 | 12.48 | **11.92** | 12.36 |

The salient channels’ relative error keeps falling as $s$ grows, as Equation [(17)](#eq:error-ratio) predicts, but perplexity is best at $s=2$. Larger scales raise the maximum of more groups, and a larger $\Delta'$ coarsens the grid for every non-salient weight in those groups, whose error grows by the factor $\Delta'/\Delta$. A good scale has to balance the two effects.

### Searching for the scale

AWQ chooses the scales by minimizing the layer’s output error after quantization:

$$
s^*=\arg\min_s\ \mathcal L(s),
\qquad
\mathcal L(s)=\left\|Q\!\left(W\operatorname{diag}(s)\right)\left(\operatorname{diag}(s)^{-1}X\right)-WX\right\|.
\tag{18}
$$

Here $X$ is cached from a small calibration set, which AWQ draws from the Pile, a general-purpose text corpus, to avoid tuning to a specific downstream domain. This is the same layer-wise objective as Equation [(3)](#eq:layer-objective), but the only free variables are the per-channel scales; the weights themselves are never adjusted. The quantizer is not differentiable, so the objective cannot be minimized with ordinary backpropagation, and the paper found approximate gradients, such as straight-through estimates, unstable.

Instead, AWQ restricts the search to a one-parameter family. Since saliency is determined by activation magnitude, the scales are tied to it:

$$
s=s_X^{\alpha},
\qquad
\alpha^*=\arg\min_{\alpha\in[0,1]}\ \mathcal L\!\left(s_X^{\alpha}\right),
\tag{19}
$$

where $s_X$ is the average magnitude of each input channel over the calibration tokens, and the power is taken elementwise. Setting $\alpha=0$ means no scaling, and $\alpha=1$ is the most aggressive scaling in the family. AWQ finds $\alpha^*$ by a grid search over 20 values. It also applies weight clipping, chosen to further reduce the same output error.

The inverse scales $\operatorname{diag}(s)^{-1}$ need no separate operation at inference time: they can usually be folded into the operator that produces $X$, such as the preceding layer normalization or linear layer. The quantized model therefore has the same structure and cost as an RTN model. On OPT-6.7B at INT3 with $g=128$, the searched scales reach a perplexity of 11.39, matching the result of keeping the salient 1% in FP16 while storing every weight in 3 bits.

<figure class="awq-figure">
  <a href="/images/awq/awq-figure-2.png" target="_blank" rel="noreferrer"><img src="/images/awq/awq-figure-2.png" alt="Figure 2 from the AWQ paper in three panels. (a) RTN quantizes an FP16 weight matrix to INT3, perplexity 43.2. (b) The salient weights, chosen by activation magnitude, stay in FP16, giving a mixed-precision matrix with bad hardware efficiency, perplexity 13.0. (c) Weights are scaled by the average activation magnitude, raised to the power alpha, before quantization, and all stay in INT3, perplexity 13.0." width="1960" height="472" loading="lazy" /></a>
  <figcaption>Figure 2 from Lin et al. (2024). (a) RTN quantizes every weight independently. (b) Keeping the salient weights, chosen by activation magnitude, in FP16 recovers most of the accuracy but produces a mixed-precision matrix. (c) AWQ scales each channel by its average activation magnitude, raised to the power α, before quantization, so every weight stays in INT3. The figure draws the weight matrix with input channels as rows. Its perplexities are for OPT-6.7B at INT3 with groups of 128, but they differ from the paper’s Table 1 for the same stated setting (23.54 for RTN and 11.39 for 1% FP16). Select the figure to open it at full resolution. Source: <a href="https://arxiv.org/abs/2306.00978">arXiv:2306.00978</a>.</figcaption>
</figure>

## Results

The paper compares AWQ with RTN and GPTQ on LLaMA and Llama-2 models, using groups of 128 for every method and reporting WikiText-2 perplexity. GPTQ-R is GPTQ with a reordering trick that quantizes columns in a data-dependent order; without it, GPTQ fails on some models. **Bold** marks the best quantized result in each column.

**INT3, $g=128$**

| Method | Llama-2-7B | Llama-2-13B | Llama-2-70B | LLaMA-7B |
| --- | ---: | ---: | ---: | ---: |
| FP16 | 5.47 | 4.88 | 3.32 | 5.68 |
| RTN | 6.66 | 5.52 | 3.98 | 7.01 |
| GPTQ | 6.43 | 5.48 | 3.88 | 8.81 |
| <span class="nowrap">GPTQ-R</span> | 6.42 | 5.41 | 3.86 | 6.53 |
| AWQ | **6.24** | **5.32** | **3.74** | **6.35** |

**INT4, $g=128$**

| Method | Llama-2-7B | Llama-2-13B | Llama-2-70B | LLaMA-7B |
| --- | ---: | ---: | ---: | ---: |
| FP16 | 5.47 | 4.88 | 3.32 | 5.68 |
| RTN | 5.73 | 4.98 | 3.46 | 5.96 |
| GPTQ | 5.69 | 4.98 | 3.42 | 6.22 |
| <span class="nowrap">GPTQ-R</span> | 5.63 | 4.99 | 3.43 | 5.83 |
| AWQ | **5.60** | **4.97** | **3.41** | **5.78** |

AWQ has the lowest perplexity in every column at both bit widths. At 4 bits, all methods are close, and AWQ stays within 0.13 of FP16 on every Llama-2 model. The differences grow at 3 bits: on Llama-2-7B, AWQ adds 0.77 to the FP16 perplexity, compared with 0.95 for GPTQ-R and 1.19 for RTN. LLaMA-7B shows GPTQ’s sensitivity to column order: without reordering, its INT3 perplexity of 8.81 is worse than RTN’s 7.01.

## Conclusion

GPTQ and AWQ minimize the same layer-wise output error but use calibration data in different ways. GPTQ uses the full input correlations to **fix** rounding errors after they occur, adjusting the remaining weights so that the errors cancel. AWQ uses only per-channel activation magnitudes to **place** precision before rounding, giving salient channels a finer effective grid and then rounding every weight independently. Because AWQ searches a few quantization settings per layer rather than fitting individual weights, it depends far less on its calibration data.

The two methods are complementary rather than competing. The paper combines them for 2-bit quantization with groups of 64: on OPT-13B, the combination lowers perplexity from 16.74 with GPTQ alone to 13.25.

### Limitations

The error analysis behind Equation [(17)](#eq:error-ratio) rests on two empirical approximations: $\Delta'\approx\Delta$, and an average rounding error that does not depend on the scale. The scale sweep shows the first one failing as $s$ grows, which is why AWQ searches for its scales instead of using a closed-form choice.

The paper also does not compare quantization time. GPTQ reports about four GPU-hours for a 175B model, while AWQ reports no corresponding runtime for its search, so the two procedures’ costs cannot be compared from the papers alone.

## References

1. Elias Frantar, Saleh Ashkboos, Torsten Hoefler, and Dan Alistarh. “GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers.” *International Conference on Learning Representations (ICLR)*, 2023. [Read on arXiv](https://arxiv.org/abs/2210.17323).
2. Ji Lin, Jiaming Tang, Haotian Tang, Shang Yang, Wei-Ming Chen, Wei-Chen Wang, Guangxuan Xiao, Xingyu Dang, Chuang Gan, and Song Han. “AWQ: Activation-aware Weight Quantization for On-Device LLM Compression and Acceleration.” *Proceedings of Machine Learning and Systems (MLSys)*, 2024. [Read on arXiv](https://arxiv.org/abs/2306.00978).
3. Babak Hassibi, David G. Stork, and Gregory J. Wolff. “Optimal Brain Surgeon and General Network Pruning.” *IEEE International Conference on Neural Networks*, 1993.
4. Elias Frantar, Sidak Pal Singh, and Dan Alistarh. “Optimal Brain Compression: A Framework for Accurate Post-Training Quantization and Pruning.” *Advances in Neural Information Processing Systems (NeurIPS)*, 2022. [Read on arXiv](https://arxiv.org/abs/2208.11580).
