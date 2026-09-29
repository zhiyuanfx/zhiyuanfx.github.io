---
title: 'Better reasoning through sampling'
date: 2026-03-15
keywords: ['Power Sampling', 'MCMC', 'LLM']
---

Can we improve a language model’s reasoning by changing how we sample, while keeping its weights fixed? Our project builds on Karan and Du’s *Reasoning with Sampling: Your Base Model is Smarter Than You Think*. We tested local uniform revision and inverse-probability revision with Qwen2.5-Math-7B, aiming to spend less computation on easy parts of a trace and more on uncertain transitions. We also tried semantic blocks, an intuitive idea that failed in our setup because the model did not reliably follow step-delimiter rules.

I worked on this project at the University of Washington’s Paul G. Allen School, collaborating with Dr. Mars Gao and Dr. Yikun Zhang. The probability framework and published benchmarks below come from **Karan and Du**. Local uniform revision, inverse-probability revision, and the semantic-block attempts are **our extensions**. The later tables contain **our local and inverse-probability experiments**.

## 1. Preliminaries: probabilities over complete answers

Let $c$ be a fixed prompt and $x_{1:T}$ a generated token sequence. An autoregressive model defines

$$
p(x_{1:T}\mid c)=\prod_{t=1}^{T}p(x_t\mid c,x_{<t}).
$$

Ordinary sampling draws each token from its conditional distribution. The product gives the probability of the complete sequence. This distinction matters when we sharpen the distribution.

## 2. Why sharpen the answer distribution?

Reinforcement learning can improve reasoning by shifting probability toward better answers. One useful interpretation is **distribution sharpening**: capabilities already present in a base model become easier to elicit because successful reasoning paths receive more probability mass. Karan and Du ask whether some of RL’s gains can be recovered by sharpening the base distribution directly.

If that interpretation explains part of RL’s success, we can try to reproduce the effect **at sampling time**, avoiding the cost of updating model weights through RL training. We still spend computation during inference, but the model remains fixed. The question becomes: which distribution should we sample from to favor stronger complete answers?

A natural, simple choice is the **power distribution**. For a fixed sequence length, it raises the base model’s complete-sequence probabilities to a power:

$$
\pi_\alpha(x\mid c)=\frac{p(x\mid c)^\alpha}{Z_\alpha(c)},
\qquad \alpha>1.
$$

Here $Z_\alpha(c)$ is the **normalizing constant**: the sum of the powered probabilities over all possible generated sequences $y$ of that length,

$$
Z_\alpha(c)=\sum_{y\in\mathcal V^T}p(y\mid c)^\alpha,
$$

where $\mathcal V$ is the token vocabulary. Dividing by this sum makes the target probabilities add to one.

Exponentiation increases the relative weight of more likely sequences. For $p(x)>p(y)>0$,

$$
\frac{\pi_\alpha(x\mid c)}{\pi_\alpha(y\mid c)}
=\left(\frac{p(x\mid c)}{p(y\mid c)}\right)^\alpha.
$$

This is a direct way to sharpen the base distribution without training another model.

### Why not just lower the temperature?

Some may wonder whether simply lowering the generation temperature already achieves this. The distinction is that we care about the probability of an **entire reasoning path**, rather than sharpening each next-token choice in isolation. Following the paper’s Proposition 1, we can see the difference by writing the next-token conditionals in terms of complete future paths.

Fix a generated prefix $h=x_{<t}$, let $v$ be the candidate next token, and let $z=x_{>t}$ range over all remaining continuations. Sums over $w$ range over the token vocabulary $\mathcal V$. Under the power distribution, the conditional probability is

$$
\pi_\alpha(v\mid c,h)
=\frac{\sum_z p(h,v,z\mid c)^\alpha}
{\sum_w\sum_z p(h,w,z\mid c)^\alpha}.
$$

Each complete path is exponentiated **before** its contribution is summed over possible futures.

Low-temperature sampling instead uses $\tau=1/\alpha$ to sharpen the ordinary next-token conditional:

$$
q_\tau(v\mid c,h)
=\frac{p(v\mid c,h)^\alpha}
{\sum_w p(w\mid c,h)^\alpha}.
$$

Marginalizing the base distribution gives

$$
p(v\mid c,h)
=\frac{\sum_z p(h,v,z\mid c)}
{\sum_w\sum_z p(h,w,z\mid c)}.
$$

Substituting this into the temperature formula cancels the common prefix normalizer and yields

$$
q_\tau(v\mid c,h)
=\frac{\left(\sum_z p(h,v,z\mid c)\right)^\alpha}
{\sum_w\left(\sum_z p(h,w,z\mid c)\right)^\alpha}.
$$

The relative weights therefore have different forms:

$$
\begin{aligned}
\text{Power sampling:}&\quad
\underbrace{\sum_z p(h,v,z\mid c)^\alpha}_{\text{sum of exponents}},\\
\text{Low temperature:}&\quad
\underbrace{\left(\sum_z p(h,v,z\mid c)\right)^\alpha}_{\text{exponent of a sum}}.
\end{aligned}
$$

Exponentiation and summation generally do not commute. The next-token conditionals, and hence the distributions over complete sequences, therefore generally differ. Temperature favors a token with a large aggregate probability across its futures; power sampling accounts for how probability is concentrated among individual complete paths.

For a two-token illustration, suppose $p(aa)=0$, $p(ab)=0.45$, and $p(ba)=p(bb)=0.275$. With $\alpha=2$, low-temperature sampling prefers starting with $b$: its weight is $0.55^2=0.3025$, versus $0.45^2=0.2025$ for $a$. Power sampling prefers $a$: its complete-path weight is $0.2025$, versus $2(0.275^2)=0.15125$ for $b$. It favors the branch leading to the most likely complete sequence, $ab$.

Although $a$ has lower next-token probability under both the base model and low-temperature sampling, the power distribution favors it because it leads to a stronger individual future path. The larger aggregate probability of $b$ comes from multiple weaker completions. This is the paper’s central reasoning intuition: choosing a locally plausible token can still lead into poor full solutions, while a less obvious token may open a coherent, high-likelihood continuation.

Karan and Du connect this distinction to **critical windows** or **pivotal tokens**, where a few choices strongly influence whether the rest of a reasoning trace succeeds. Power sampling’s preference for fewer but stronger future paths provides an implicit bias toward planning for high-likelihood continuations, rather than committing solely on the strength of the immediate token probability.

## 3. MCMC sampling for power distributions

### Metropolis–Hastings avoids the global normalizer

Enumerating every answer to compute the normalizing constant $Z_\alpha(c)$ is intractable. Metropolis–Hastings (MH) uses the unnormalized target $\widetilde\pi(x)=p(x\mid c)^\alpha$ and a proposal $Q(x'\mid x)$. Given a current sequence $x$, it accepts $x'$ with probability

$$
A(x',x)=\min\left\{1,
\frac{\widetilde\pi(x')Q(x\mid x')}
{\widetilde\pi(x)Q(x'\mid x)}\right\}.
$$

On rejection, the chain keeps $x$. The unknown normalizer cancels. Under suitable irreducibility and aperiodicity conditions, the chain converges to the target. A finite number of updates gives an approximation, whose quality depends on mixing.

### Why suffix proposals are tractable

MH requires both the forward proposal probability $Q(x'\mid x)$ and the reverse probability $Q(x\mid x')$. Random suffix resampling makes both easy to evaluate. For a sequence of $T$ generated tokens, choose a start position $m$ uniformly with probability $1/T$, preserve the prefix $h$, and draw a new suffix $u'$ from the proposal model $q_\tau$.

Conditional on that chosen position, the forward probability is simply the likelihood of the regenerated suffix. The reverse probability is obtained by treating the old suffix $u$ as a fresh continuation of the same prefix:

$$
\begin{aligned}
Q_m(x'\mid x)&=q_\tau(u'\mid h),\\
Q_m(x\mid x')&=q_\tau(u\mid h).
\end{aligned}
$$

These likelihoods are available from the proposal model’s next-token probabilities. The uniform start-position factors are identical in the forward and reverse moves, so they cancel in the fixed-length acceptance ratio.

<figure class="sampling-figure">
  <img src="/images/sampling/paper-figure-3.png" alt="Figure 3 from Karan and Du: select a token position, preserve the prefix, resample the suffix, then accept the candidate or retain the current sequence and repeat." width="1105" height="290" loading="lazy" />
  <figcaption>Figure 3 from Karan and Du (2025): random suffix resampling followed by Metropolis–Hastings acceptance or rejection. Source: <a href="https://arxiv.org/abs/2510.14901v1">arXiv:2510.14901v1</a>, CC BY 4.0.</figcaption>
</figure>

### The original blockwise algorithm

Karan and Du progressively grow the sequence instead of repeatedly restarting a full-length answer. At stage $k$, the intermediate target is

$$
\pi_k(x_{1:kB}\mid c)\propto p(x_{1:kB}\mid c)^\alpha,
$$

where $B$ is the block size. Each stage extends the current sequence by up to $B$ tokens, then performs $N_{\mathrm{MCMC}}$ suffix-resampling updates. Each update chooses a starting position uniformly across the generated prefix, preserves everything before it, and regenerates the suffix with the proposal model.

For a fixed start position, let $u$ and $u'$ be the current and proposed suffixes and $h$ their shared prefix. Define $r$ as the **unclipped Metropolis–Hastings acceptance ratio**, so the proposal is accepted with probability $\min\{1,r\}$:

$$
r=\frac{p(u'\mid h)^\alpha q_\tau(u\mid h)}
{p(u\mid h)^\alpha q_\tau(u'\mid h)}.
$$

The shared-prefix probabilities cancel, and the log ratio becomes

$$
\begin{aligned}
\log r={}&\alpha\log p(u'\mid h)-\alpha\log p(u\mid h)\\
&+\log q_\tau(u\mid h)-\log q_\tau(u'\mid h).
\end{aligned}
$$

Uniform position-selection factors also cancel for this fixed-length update. Each suffix probability is a product of next-token probabilities, so its log probability is a sum over the generated tokens.

The paper uses at most 3,072 generated tokens and 16 blocks of 192 tokens. Its reasoning experiments use $\alpha=4$ with proposal temperature $0.25$; AlpacaEval uses proposal temperature $0.5$.

## 4. What the original paper achieved

### Published Table 1: single-shot benchmarks

These values reproduce **Table 1 of Karan and Du**. “Power sampling” refers to their method. GRPO is their reinforcement-learning baseline, posttrained on MATH. MATH500, HumanEval, and GPQA are accuracy fractions; AlpacaEval 2.0 is a length-controlled win-rate score on a percentage scale.

| Model | Method | MATH500 | HumanEval | GPQA | AlpacaEval 2.0 |
| :--- | :--- | ---: | ---: | ---: | ---: |
| Qwen2.5-Math-7B | Base | 0.496 | 0.329 | 0.278 | 1.61 |
| Qwen2.5-Math-7B | Low temperature | 0.690 | 0.512 | 0.353 | 2.09 |
| Qwen2.5-Math-7B | **Power sampling** | **0.748** | **0.573** | **0.389** | **2.88** |
| Qwen2.5-Math-7B | GRPO (MATH) | 0.785 | 0.537 | 0.399 | 2.38 |
| Qwen2.5-7B | Base | 0.498 | 0.329 | 0.278 | 7.05 |
| Qwen2.5-7B | Low temperature | 0.628 | 0.524 | 0.303 | 5.29 |
| Qwen2.5-7B | **Power sampling** | **0.706** | **0.622** | **0.318** | **8.59** |
| Qwen2.5-7B | GRPO (MATH) | 0.740 | 0.561 | 0.354 | 7.62 |
| Phi-3.5-mini-instruct | Base | 0.400 | 0.213 | 0.273 | 14.82 |
| Phi-3.5-mini-instruct | Low temperature | 0.478 | 0.585 | 0.293 | 18.15 |
| Phi-3.5-mini-instruct | **Power sampling** | **0.508** | **0.732** | **0.364** | **17.65** |
| Phi-3.5-mini-instruct | GRPO (MATH) | 0.406 | 0.134 | 0.359 | 16.74 |

For Qwen2.5-Math-7B, power sampling raises MATH500 accuracy from 49.6% to 74.8%, a **25.2 percentage-point** increase. It remains below GRPO’s 78.5% on MATH500, but exceeds GRPO on HumanEval and AlpacaEval. This supports the claim that sampling can recover substantial reasoning performance from fixed model weights.

### Published Figure 4: likelihood and confidence

<figure class="sampling-figure">
  <img src="/images/sampling/paper-figure-4.png" alt="Two histograms from Karan and Du’s Figure 4. Power-sampling responses shift toward higher base-model average log likelihood and confidence; GRPO responses are concentrated near the highest values." width="1105" height="580" loading="lazy" />
  <figcaption>Figure 4 from Karan and Du (2025), rendered from the supplied paper. Both panels evaluate MATH500 responses under Qwen2.5-Math-7B. “Ours” in the original legend means the paper’s power sampler. Source: <a href="https://arxiv.org/abs/2510.14901v1">arXiv:2510.14901v1</a>, CC BY 4.0.</figcaption>
</figure>

The left panel measures average sequence log likelihood. Power sampling moves responses toward higher-likelihood regions of the base model while retaining a visible spread. GRPO is more concentrated near the high-likelihood end.

The right panel shows that power sampling also shifts responses toward higher-confidence regions of the base model, much as GRPO does. Together, the panels show how the paper’s sampler reproduces an important part of GRPO’s effect: concentrating answers in regions the base model assigns higher likelihood and confidence, without updating its weights. Power sampling also retains a broader spread of responses than GRPO, preserving room for different reasoning paths.

## 5. Our improvement attempts

### The baseline: uniform revision across the entire generated prefix

The paper’s Algorithm 1 chooses a resampling start position uniformly across all generated positions at each stage. This is **U-full** (“uniform entire prefix”) in our experiment tables. The prompt stays fixed, but any generated token can become the start of a suffix rewrite.

### The bottleneck: repeatedly regenerating long suffixes

Full-prefix revision provides broad freedom to repair earlier decisions, but an early start forces the model to regenerate almost the entire answer-so-far, even when only the latest calculation needs attention.

At stage $k$, a uniformly selected suffix contains roughly $kB/2$ tokens. Across stages, the paper estimates

$$
\mathbb E[\text{resampled tokens}]
\approx\frac{N_{\mathrm{MCMC}}T^2}{4B}.
$$

The bottleneck is repeated generation of long suffixes. Our first improvement targets this cost by changing **where we sample the revision-start index**.

### First improvement: uniform revision in a recent window

Our first modification restricts the starting position to the current block or a few recent blocks, while retaining uniform selection within that window. For prompt length $c$, current sequence length $t$, block size $B$, and window size $n$ blocks, the eligible starts are

$$
\mathcal W_n=\{\max(c,t-nB),\ldots,t-1\},
\qquad m\sim\operatorname{Uniform}(\mathcal W_n).
$$

Choosing $n=1$ gives the **U-local** configuration recorded in the tables. Allowing the window to cover all generated tokens recovers the original uniform-start baseline. Several recent blocks provide an intermediate choice; our uniform-window results below use a single block.

The intuition comes from working through a math problem: after establishing the setup, we usually check the current algebra or the last few deductions before restarting the whole derivation. A recent window reduces the average suffix length and avoids repeatedly rewriting earlier work. The tradeoff is that a mistake outside the window cannot be repaired during that stage.

### Second improvement: inverse-probability revision

Uniform selection treats every token as equally worth reconsidering. Our second attempt biases revision toward tokens that were less likely under the proposal distribution. A low-probability transition may indicate uncertainty or a difficult part of the reasoning process.

For example, while solving a math problem, routine arithmetic may feel straightforward, but choosing a substitution or deciding which lemma applies may require several attempts. We wanted the sampler to spend more of its revision budget at these uncertain transitions, regenerating the reasoning that follows them. This is a useful search intuition, even though a surprising token can also be a correct, unusual insight.

For each generated token, define its **normalized proposal log probability**:

$$
\ell_i=\log q_\tau(x_i\mid c,x_{<i}).
$$

We form clipped surprise scores and sample the revision start with a softmax:

$$
 a_i=\operatorname{clip}(-\ell_i,w_{\min},w_{\max}),
\qquad
\rho(i\mid x,\mathcal W)=\frac{\exp(a_i)}{\sum_{j\in\mathcal W}\exp(a_j)}.
$$

When clipping is inactive, this gives **inverse-probability weighting**:

$$
\rho(i\mid x,\mathcal W)\propto
\frac{1}{q_\tau(x_i\mid c,x_{<i})}.
$$

Thus lower-probability tokens receive higher revision-start weights. Our clipping bounds are $w_{\min}=0$ and $w_{\max}=10^9$.

A two-block window restricts start positions to the trailing two token blocks (**I-2block**). A full-prefix window makes every generated position eligible (**I-full**). Only the start index is selected by inverse probability; the model then regenerates the full suffix from that index.

Our inverse-probability experiments use a **deterministic nested-style refinement rule** instead of the paper’s stochastic MH acceptance test. Define $L_\tau(u)=\sum_i\log q_\tau(u_i\mid h,u_{<i})$. For equal-length current and proposed suffixes, it accepts a candidate if

$$
L_\tau(u')>\frac{\tau}{1-\tau}L_\tau(u),
\qquad 0<\tau<1.
$$

At our temperature $\tau=0.25$, the multiplier is $1/3$:

$$
L_{0.25}(u')>\frac13L_{0.25}(u).
$$

These log scores are nonpositive, so this is stricter than simply accepting a likelihood improvement. If the current score is $-90$, a proposal with score $-60$ improves it but fails the threshold of $-30$; a score of $-20$ passes. There is no uniform random acceptance draw in this rule.

The decision uses **normalized proposal log probabilities**. If an end-of-sequence token shortens a proposal, we compare it with the corresponding portion of the current suffix, ending at the same position.

### Semantic blocks: an intuitive idea

A more ambitious idea was to replace token-count blocks with **reasoning steps**. A person often develops an intermediate claim, checks it, and then proceeds. We hoped that sampling and revising complete steps would be more natural than cutting a derivation at an arbitrary token count.

We explored two delimiter-based variants:

| Variant | What changed | Reasoning intuition |
| :--- | :--- | :--- |
| Refine, then retain one step | Generate a token block, run the original sum-based MH loop, then cut the winning sequence at the first step delimiter in the newly added region. Retain the delimiter. | Allow lookahead while refining, then commit only the next completed step. |
| Compare one step at a time | Cut every extension and proposal at its first delimiter before comparison. Compare average per-token target and proposal log scores instead of sums. | Compare alternatives at the scale of one reasoning step, reducing the influence of step length. |

Both variants generate to an upper bound before discarding tokens after the delimiter; they do not save those discarded tokens’ generation cost in that call.

**These semantic-block attempts failed in our setup, and we collected no numerical results from them.** With Qwen2.5-Math-7B, strict delimiter following was unreliable: our model was too small to consistently obey the formatting convention on which step extraction depended. Without reliable delimiters, we could not consistently identify the intended semantic revision unit.

This is still an interesting direction. A more capable delimiter-following model or a separate step-boundary detector could make the idea testable.

## 6. Our experiments and numerical results

We used **Qwen2.5-Math-7B** on an **RTX 5090**, with temperature **0.25**, a maximum of **3,072 generated tokens**, and **16 blocks**. Each token block therefore has size **192**. The temperature corresponds to power $\alpha=4$ in the original sampler. The inverse-probability configurations use the deterministic acceptance rule described above.

The records contain three separate ten-problem batches from **MATH500**: **0–9**, **20–29**, and **30–39**. The first two use two seeds; the last uses twelve. Their refinement budgets are 10, 20, and 12 attempts per block, respectively, for the fixed-step configurations. Budgets differ, so comparisons are made **within a batch**.

| Label | Configuration in the experimental sheet |
| :--- | :--- |
| U-local | Uniform, in block |
| U-full | Original paper’s baseline: uniform, entire generated prefix |
| I-2block | Inverse probability, trailing two blocks; nested acceptance |
| I-full | Inverse probability, entire prefix; nested acceptance |
| I-2block-A | Trailing two blocks; nested acceptance; “10 acceptance” or “12 acceptance” budget |
| I-full-A | Entire prefix; nested acceptance; “10 acceptance” or “12 acceptance” budget |

Accuracy fractions, acceptance rates, and runtime seconds below are transcribed from the sheets. **“10 acceptance” and “12 acceptance” mean continuing refinement until 10 or 12 proposals have been accepted per block**, rather than stopping after that many attempts. Rejected proposals still consume computation, so these settings can run substantially longer. The reported acceptance rate is accepted proposals divided by attempted proposals.

### How we compute Pass@k

The tables’ **Best-of-k** values are Monte Carlo estimates of **Pass@k**: a problem counts as solved if at least one of $k$ sampled answers is correct. We grade each seed’s generated answer against the reference answer with an automated math grader; grading failures count as incorrect. This produces a binary correctness matrix $C_{s,j}$ for seed $s$ and problem $j$.

For each $k$, we sample **200 subsets of $k$ distinct seeds**, uniformly without replacement within each subset. Subsets may recur across draws. For each subset, it takes the maximum correctness across its seeds for every problem, then averages over the problems and the 200 draws. For $M$ problems,

$$
\widehat{\operatorname{Pass@}k}
=\frac{1}{200M}\sum_{r=1}^{200}\sum_{j=1}^{M}
\max_{s\in S_{r,k}}C_{s,j},
\qquad |S_{r,k}|=k.
$$

The subset-selection RNG is initialized with seed **0 for each k**. We use sampled subsets for every $k$, rather than enumerating all combinations. Therefore Best-of-1 can differ slightly from the direct single-shot mean because its 200 draws need not select every seed equally often. When $k$ equals the number of available seeds, every subset includes all of them, so the score is the exact observed coverage of that seed pool.

### Problems 0–9: 10 MCMC steps, 2 seeds

Paired values are the separate seed runs. The last two columns continue until **10 proposals are accepted per block**.

| Metric | U-local | U-full | I-2block | I-full | I-2block-A | I-full-A |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| Single-shot accuracy | 0.9, 0.7 | 0.7, 0.8 | 0.8, 0.8 | 0.8, 0.9 | 0.9, 0.9 | 0.9, 0.9 |
| Best-of-1 | 0.789 | 0.7555 | 0.8 | 0.8555 | 0.9 | 0.9 |
| Best-of-2 | 0.9 | 0.8 | 0.8 | 0.9 | 0.9 | 0.9 |
| Acceptance rate | 0.7 | 0.58 | 0.5697 | 0.5762 | 0.5401 | 0.512 |
| Runtime (s), seed 1 | 874 | 1349 | 1241 | 1627 | 3424 | 7296 |
| Runtime (s), seed 2 | 1170 | 1627 | 1155 | 1913 | 2983 | 5606 |

U-local averages 1,022 seconds versus U-full’s 1,488 seconds: **31.3% less runtime**. Mean single-shot accuracy is 80% versus 75%. Acceptance-labeled settings reach 90% in both seeds but take much longer. Ten problems and two seeds provide a small ablation, not a full-benchmark estimate.

### Problems 20–29: 20 MCMC steps, 2 seeds

| Metric | U-local | U-full | I-2block | I-full |
| :--- | ---: | ---: | ---: | ---: |
| Single-shot accuracy | 0.8, 0.8 | 0.6, 0.8 | 0.8, 0.8 | 0.8, 0.8 |
| Best-of-1 | 0.8 | 0.71 | 0.8 | 0.8 |
| Best-of-2 | 0.9 | 0.8 | 0.9 | 0.9 |
| Acceptance rate | 0.75 | 0.55 | 0.6592 | 0.5704 |
| Runtime (s), seed 1 | 1922 | 5532 | 3527 | 5090 |
| Runtime (s), seed 2 | 1348 | 4618 | 2806 | 5229 |

U-local averages 1,635 seconds versus 5,075 seconds for U-full: a **67.8% runtime reduction**, with mean single-shot accuracy of 80% versus 70%. Both inverse-probability settings also reach 80%, but cost more than U-local. Avoiding long rewrites is a plausible explanation; output lengths and hardware traces would be needed to explain the entire runtime difference.

### Problems 30–39: 12 MCMC steps, 12 seeds

This batch gives a broader view of seed variation and diversity. The last two columns continue until **12 proposals are accepted per block**. **Runtimes are per-seed averages across the twelve runs**, not totals across seeds.

| Metric | U-local | U-full | I-2block | I-full | I-2block-A | I-full-A |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| Single-shot mean | 0.73 | 0.77 | 0.77 | 0.79 | 0.791666667 | 0.81 |
| Single-shot variance | 0.012 | 0.006 | 0.0024 | 0.008 | 0.006 | 0.006 |
| Best-of-1 | 0.7265 | 0.7695 | 0.772 | 0.796 | 0.783 | 0.814 |
| Best-of-2 | 0.815 | 0.826 | 0.8065 | 0.8495 | 0.834 | 0.8615 |
| Best-of-3 | 0.8505 | 0.8465 | 0.825 | 0.8725 | 0.867 | 0.884 |
| Best-of-4 | 0.8885 | 0.8555 | 0.8345 | 0.884 | 0.887 | 0.8965 |
| Best-of-5 | 0.915 | 0.8645 | 0.839 | 0.889 | 0.895 | 0.8975 |
| Best-of-6 | 0.9315 | 0.8725 | 0.845 | 0.895 | 0.898 | 0.899 |
| Best-of-7 | 0.9455 | 0.8845 | 0.861 | 0.8995 | 0.898 | 0.8995 |
| Best-of-8 | 0.9635 | 0.89 | 0.86 | 0.9 | 0.9 | 0.9 |
| Best-of-9 | 0.9735 | 0.8945 | 0.8745 | 0.9 | 0.9 | 0.9 |
| Best-of-10 | 0.982 | 0.899 | 0.883 | 0.9 | 0.9 | 0.9 |
| Best-of-11 | 0.993 | 0.9 | 0.8915 | 0.9 | 0.9 | 0.9 |
| Best-of-12 | 1 | 0.9 | 0.9 | 0.9 | 0.9 | 0.9 |
| Acceptance rate | 0.644211111 | 0.557055556 | 0.595 | 0.5703 | 0.5274 | 0.5062 |
| Mean runtime per seed (s) | 10627.207 | 22591.672 | 16200.969 | 20845.021 | 33330.816 | 78652.814 |

Three patterns stand out:

1. **Local uniform revision is inexpensive but weaker in one shot.** U-local uses **53.0% less recorded runtime** than U-full, but its single-shot mean is 73% versus 77%.
2. **Inverse-probability full-prefix revision slightly improves one-shot performance.** I-full reaches 79% versus U-full’s 77%, a 2 percentage-point increase, with 7.7% less recorded runtime. I-2block matches U-full’s 77% with 28.3% less runtime and the lowest reported variance, 0.0024.
3. **Concentration can come with reduced coverage.** U-local reaches a recorded Best-of-12 of 100%, while the others reach 90%. I-full-A has the highest single-shot mean, 81%, but takes about **3.48 times** U-full’s recorded runtime. More accepted revisions do not automatically improve coverage across multiple answers.

I-2block’s Best-of-8, 0.86, is slightly below its Best-of-7, 0.861. Exact Pass@k over uniformly chosen subsets is nondecreasing, but we estimate each k from separately sampled subsets rather than constructing nested subsets. Finite Monte Carlo sampling can therefore produce small dips. We retain the recorded estimates instead of forcing a monotone curve.

### What these experiments support

Local revision is cheaper than whole-prefix uniform revision in every recorded batch. Its accuracy tradeoff varies: it improves mean single-shot accuracy in the two-seed batches but lowers it in the twelve-seed batch. Inverse-probability selection and larger acceptance budgets offer other cost/accuracy tradeoffs without a universal winner.

## 7. Summary

The original paper provides a principled target: sharpen the distribution over whole sequences and approximate it with autoregressive MCMC. Its results show how inference-time refinement can yield much stronger reasoning from a fixed base model.

Our evaluated improvements ask **where revision should begin**: a recent uniform window reduces the cost of rewriting, while inverse-probability selection concentrates attention on uncertain transitions and is paired with a stricter deterministic acceptance rule. Our separate semantic-block attempts ask whether revision should follow complete reasoning steps. The semantic-block variants could not be evaluated because our 7B model did not reliably follow delimiter rules; their failure remains a useful lesson and a motivation for better step-boundary detection.

Our resampling experiments expose the practical tradeoff. Local edits can substantially reduce runtime and retain useful diversity, while broader or more persistent revision can improve single-shot concentration at a much higher cost. The next question is how to allocate a fixed budget across step boundaries, revision locations, and independent attempts while retaining the ability to repair an early mistake.

## Reference

Aayush Karan and Yilun Du. **Reasoning with Sampling: Your Base Model is Smarter Than You Think.** 2025. [arXiv:2510.14901v1](https://arxiv.org/abs/2510.14901v1). The probability setup and algorithm follow Sections 3–4; the published results and visualizations are Table 1 and Figures 3–4. [Project page](https://aakaran.github.io/reasoning_with_sampling/).
