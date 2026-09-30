---
title: 'QIPrune: Quantum-Inspired Pruning of Large Language Models'
subtitle: 'Why a stronger pruning solver also needs the right reconstruction objective'
date: 2026-09-16
keywords: ['LLM Sparsity', 'Mixed-integer Optimization', 'Quantum Hamiltonian Descent', 'Progressive Reconstruction']
---

Pruning a language model means deciding which weights to remove and how to adjust the ones that remain. Our project, **QIPrune**, studies both decisions as an optimization problem. Its central finding is that solving each local problem more accurately is only part of the answer: the objective must also reflect the inputs that the sparse model will actually receive.

QIPrune combines **quantum-inspired Hamiltonian descent (QIHD)** with a **progressive reconstruction objective**. This note walks through the formulation, the reason for changing the objective, and the experimental tradeoffs.

## Why sparsify an LLM?

Large language models contain billions of weights. Post-training sparsification aims to remove a substantial fraction while preserving the behavior of the pretrained model, without expensive full-model retraining. Sparse storage and suitable execution kernels can reduce resource requirements; actual inference speedups depend on the sparsity pattern and hardware support.

The ideal optimization would choose all sparse weights jointly to preserve the model’s end-to-end behavior. That is too large to solve directly. A practical alternative reconstructs one layer at a time using a small calibration dataset.

Two common baselines illustrate different compromises. **SparseGPT** uses a Hessian-based reconstruction method with greedy weight selection and compensation. **Wanda** ranks weights using an activation-aware importance score, rather than explicitly optimizing the reconstruction problem. Both are scalable. Our question is what we gain by solving the underlying local optimization problems more faithfully—and when those gains carry through to the final model output.

## From layer reconstruction to a row-wise MIQP

Let $W_\ell\in\mathbb{R}^{r\times d}$ be a linear layer’s weight matrix and $X_\ell\in\mathbb{R}^{d\times N}$ its input activations over $N$ calibration tokens. The usual layer reconstruction problem is

$$
\min_{\widehat W_\ell}\;
\left\|W_\ell X_\ell-\widehat W_\ell X_\ell\right\|_F^2,
\qquad \text{subject to sparsity constraints.}
$$

It asks the sparse layer to reproduce the dense layer’s output on the **same inputs**. When sparsity constraints are independent across rows, the squared Frobenius norm separates into one problem per output row.

Represent a dense row as a column vector $w\in\mathbb{R}^d$, so its output is $w^\top X_\ell$. We write its sparse replacement as

$$
\widehat w=z\odot w+e.
$$

Here $z_j\in\{0,1\}$ decides whether to retain weight $j$, while $e_j$ adjusts a retained weight to compensate for pruning. For unstructured sparsity fraction $s$, the original row-wise problem becomes

$$
\begin{aligned}
\min_{z,e}\quad &
\left\|w^\top X_\ell-(z\odot w+e)^\top X_\ell\right\|_2^2,\\
\text{subject to}\quad &z\in\{0,1\}^{d},\\
&\mathbf{1}^\top z=\lfloor(1-s)d\rfloor,\\
&-U_jz_j\le e_j\le U_jz_j,\quad j=1,\ldots,d.
\end{aligned}
$$

The cardinality constraint selects the required number of weights. The compensation bounds force $e_j=0$ when $z_j=0$, keeping pruned entries exactly zero, and limit how far retained weights can move. At 50% sparsity, half the entries are selected. Structured patterns can instead impose cardinality constraints within groups.

This is a **mixed-integer quadratic program (MIQP)**: the objective is quadratic, the constraints are linear, and the mask variables are binary. The hard part is choosing the mask jointly with the compensations. Even after decomposing by layer and row, a model creates many thousands of these problems.

## QIHD: a stronger local solver

QIHD is a **classical, GPU-accelerated optimization method** inspired by quantum Hamiltonian descent. It approximately solves an optimization problem by simulating continuous position–momentum dynamics, rather than searching a branch-and-bound tree. Random initial states explore candidate solutions, and the numerical updates are built largely from vector operations and matrix multiplications.

For pruning, we relax the binary mask during simulation and penalize violations of binary and sparsity constraints. We then project the result to a feasible mask with the required sparsity. With that mask fixed, compensation is obtained from a convex quadratic program. Precomputed quadratic coefficients, vectorized penalties, and batched GPU computation make the repeated row-wise solves more practical.

The distinction between QHD and QIHD matters: this pruning solver runs classically and does not require a quantum computer. For more background on the Hamiltonian viewpoint and the underlying QHD algorithm, see [Quantum Hamiltonian Descent for Non-smooth Optimization](/notes/quantum-hamiltonian-descent/).

On small instances where comparison with Gurobi is feasible, QIHD reaches comparable objective values much faster. In our OPT-6.7B and LLaMA-3.2-1B row-level experiments across the two sparsity patterns, it achieves a better or equal objective than SparseGPT on approximately **99.9% of rows**, with a **32.7% reduction in the median row-wise objective**.

## The input mismatch

A stronger solver exposes a subtle weakness in the original objective. By the time we prune layer $\ell$, the preceding layers have already changed. The sparse model therefore receives activations different from those of the original dense model.

There are two relevant inputs:

- $X_\ell^{\mathrm{dense}}$: activations from the original dense prefix.
- $X_\ell^{\mathrm{pruned}}$: activations from the already-pruned prefix.

Recall the shared-input reconstruction objective:

$$
\min_{\widehat W_\ell}\;
\left\|\underbrace{W_\ell X_\ell}_{\text{dense layer output}}
-\underbrace{\widehat W_\ell X_\ell}_{\text{sparse layer output}}\right\|_F^2,
$$

subject to the sparsity constraints. Both output terms use the same activation matrix $X_\ell$. Using dense activations ignores the sparse layer’s changed input. Using pruned activations on both sides changes the dense reference output as well. Neither directly compares the original dense output with the sparse layer operating on its actual input.

This explains why a better solution to the local problem can still produce a worse final model. The solver may be doing an excellent job on a target that does not capture the error introduced upstream.

## Progressive reconstruction

We keep the original dense output as the target, but optimize the sparse row using activations from the progressively pruned model:

$$
\min_{z,e}\;
\left\|
 w^\top X_\ell^{\mathrm{dense}}
 -(z\odot w+e)^\top X_\ell^{\mathrm{pruned}}
\right\|_2^2,
$$

with the same mask and compensation constraints as before.

The sparse row can now partly compensate for activation changes caused by upstream pruning. Crucially, the activations are fixed during the row solve, so the objective remains quadratic and the problem remains an MIQP. We change the reconstruction target’s alignment with model execution while retaining the same optimization machinery.

**QIPrune is the combination:** QIHD reduces local optimization error, and progressive reconstruction directs that effort toward the inputs encountered by the sparse model.

## Ablating the objective and solver

Figure 2 separates these two choices on OPT-1.3B. **SIO** denotes the shared-input objective; **PRO** denotes progressive reconstruction. The QIHD + PRO combination is QIPrune.

<figure class="qiprune-figure">
  <div class="qiprune-panels">
    <div><a href="/images/qiprune/figure-2a.png" target="_blank" rel="noreferrer"><img src="/images/qiprune/figure-2a.png" alt="Figure 2a: OPT-1.3B final logits MSE at 50% unstructured sparsity. QIHD drops from 13.66 with SIO to 1.81 with PRO; SparseGPT and Wanda do not improve with PRO." loading="lazy" /></a><p>(a) 50% unstructured sparsity</p></div>
    <div><a href="/images/qiprune/figure-2b.png" target="_blank" rel="noreferrer"><img src="/images/qiprune/figure-2b.png" alt="Figure 2b: OPT-1.3B final logits MSE at 2:4 semi-structured sparsity. QIHD with PRO has the lowest error; changing the objective has little effect for SparseGPT and Wanda." loading="lazy" /></a><p>(b) 2:4 semi-structured sparsity</p></div>
  </div>
  <figcaption>Figure 2 from the paper, rendered from its original figure assets. Lower final logits MSE is better; both plots use logarithmic vertical axes. The full figure is retained here for context, while the result tables below focus on 50% unstructured sparsity. Select either panel to open it at full resolution.</figcaption>
</figure>

Under 50% unstructured sparsity, switching QIHD from SIO to PRO reduces final logits MSE from **13.66 to 1.81**. Changing the objective alone does not improve SparseGPT or Wanda in this setting. Conversely, QIHD with the shared-input objective performs poorly despite its stronger local optimization.

The result supports a joint explanation: better objective alignment is useful when the solver can exploit it, and better optimization is useful when the objective points toward the desired model behavior. Neither change alone is sufficient in this ablation.

## Experimental setup

The experiments use **128 calibration samples from C4**, evaluate on **WikiText-2**, and run on **H100 GPUs**. Models include OPT-125M, OPT-1.3B, OPT-6.7B, LLaMA-3.2-1B, and LLaMA-2-7B.

We report two complementary metrics:

- **Final logits MSE** compares dense and sparse model outputs and is the primary reconstruction metric.
- **Perplexity (PPL)** measures next-token likelihood against the actual tokens. Lower is better, but its objective differs from matching the dense model’s logits.

There are two QIPrune variants. **Full** applies QIHD with progressive reconstruction to every pruned layer. **Hybrid** uses it only in the final transformer layer in these experiments, with SparseGPT elsewhere. Full is evaluated on the three smaller models; Hybrid provides a less costly option for the larger ones.

## Selected results: 50% unstructured sparsity

The tables below reproduce the calibration and test portions of Table 1, split by metric for readability. **Bold** marks the best sparse result per row. A dash means the configuration was not evaluated because of limited compute; Dense is a reference for PPL, not a competing pruning method.

### Calibration set: C4

**Final logits MSE**

| Model | SparseGPT | Wanda | QIPrune Hybrid | QIPrune Full |
| --- | ---: | ---: | ---: | ---: |
| OPT-125M | 0.9490 | 1.8845 | 0.8600 | **0.7866** |
| OPT-1.3B | 4.1053 | 3.7153 | 3.6367 | **2.0396** |
| OPT-6.7B | 3.9106 | 4.4553 | **1.4893** | — |
| LLaMA-3.2-1B | 5.0355 | 3.9109 | 2.1741 | **1.6290** |
| LLaMA-2-7B | 4.5289 | 4.7162 | **3.3766** | — |

**Perplexity**

| Model | SparseGPT | Wanda | QIPrune Hybrid | QIPrune Full | Dense |
| --- | ---: | ---: | ---: | ---: | ---: |
| OPT-125M | 31.7889 | 33.3190 | 31.4135 | **30.7314** | 25.8139 |
| OPT-1.3B | 18.1246 | 19.5766 | 18.7366 | **17.0666** | 15.4152 |
| OPT-6.7B | 14.1496 | 14.6006 | **14.0352** | — | 12.2421 |
| LLaMA-3.2-1B | 23.3105 | 80.0901 | 21.7381 | **19.7487** | 12.7784 |
| LLaMA-2-7B | **8.1785** | 8.5261 | 8.3614 | — | 6.7959 |

### Test set: WikiText-2

**Final logits MSE**

| Model | SparseGPT | Wanda | QIPrune Hybrid | QIPrune Full |
| --- | ---: | ---: | ---: | ---: |
| OPT-125M | 1.2861 | 2.0394 | 1.1498 | **1.0994** |
| OPT-1.3B | 2.5439 | 3.1365 | 2.2479 | **1.8050** |
| OPT-6.7B | **1.6993** | 2.1420 | 1.9915 | — |
| LLaMA-3.2-1B | 4.7975 | 7.9180 | 3.1623 | **2.7819** |
| LLaMA-2-7B | 3.5184 | 2.9313 | **2.7955** | — |

**Perplexity**

| Model | SparseGPT | Wanda | QIPrune Hybrid | QIPrune Full | Dense |
| --- | ---: | ---: | ---: | ---: | ---: |
| OPT-125M | 37.0980 | 38.5630 | **36.9109** | 37.1345 | 26.0776 |
| OPT-1.3B | 17.2572 | 18.3268 | 17.1322 | **16.7218** | 13.8715 |
| OPT-6.7B | **12.5908** | 12.9688 | 12.9383 | — | 10.3766 |
| LLaMA-3.2-1B | 22.4325 | 26.9094 | 22.1757 | **18.9925** | 10.8316 |
| LLaMA-2-7B | 7.1049 | **7.0225** | 7.3577 | — | 5.5671 |

QIPrune achieves the lowest test logits MSE on four of the five models. The exception is **OPT-6.7B**, where SparseGPT’s 1.6993 is lower than Hybrid’s 1.9915. Our experiments showed that Hybrid still improves MSE immediately after the final transformer layer by about 5%; transformations after that layer change the final-output comparison.

## Why lower MSE does not always mean lower perplexity

Logits MSE measures how closely the sparse model reproduces the dense model’s scores across the vocabulary. PPL depends on the probability assigned to the actual next token after softmax. Smaller average logit errors can still shift the relevant token margins unfavorably.

The test results make the distinction concrete. On LLaMA-2-7B, Hybrid has the lowest MSE (**2.7955**) but a PPL of **7.3577**, compared with Wanda’s **7.0225**. On OPT-125M, Full has the lowest MSE, while Hybrid has the best sparse PPL. Reconstruction improves more consistently than next-token likelihood.

## Runtime: the cost of stronger optimization

QIHD is faster than the exact MIQP solver on the studied instances, but QIPrune remains much more expensive than SparseGPT and Wanda. An OPT-1.3B fc2 row has **8,192 dimensions** and takes about **2.5 seconds** to solve. Repeating that work over many rows and layers dominates the pruning cost.

In our experiments, QIPrune Full on OPT-1.3B required approximately **100 GPU-hours**, while Hybrid on a single transformer layer of a 6.7B model required **18 GPU-hours**. For each weight matrix, we tuned hyperparameters on 10 randomly sampled rows with 30 search steps, then reused them across the matrix.

## Limitations

**The optimization target is limited.** QIPrune preserves dense-model behavior under sparsity constraints; it does not directly optimize language-modeling likelihood. Jointly optimizing reconstruction and next-token quality is a promising direction, but a global, non-quadratic objective would require methods beyond the row-wise MIQP formulation used here.

**Pruning cost remains substantial.** Solving and tuning many row-wise problems is expensive, especially for larger models. Hybrid reduces the scope of QIHD, but the last-layer-only policy is a proof of concept rather than an optimal allocation. Better GPU batching, shared computations, block-wise optimization, and improved penalty schedules could improve the tradeoff.

## Summary

QIPrune shows why **solver quality and objective alignment must be considered together**. QIHD can solve local reconstruction problems much more faithfully, but the progressive objective is what connects that effort to the activations produced by an already-pruned model. Their combination improves final logits reconstruction across most of the evaluated models, while leaving two clear challenges: reducing pruning cost and translating reconstruction gains into more consistent language-modeling gains.

## Credits

**Authors:** Zhiyuan Jia, Pengyu Liu, Yu-Hsuan Wu, Tabish Shaik, Jianhao Ma, Jiaqi Leng, Xiaodi Wu, Chaoyue Zhao, Yuxiang Peng

<p><a href="/documents/qiprune.pdf" download="QIPrune.pdf">Download the paper (PDF)</a></p>
