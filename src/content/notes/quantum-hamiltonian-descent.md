---
title: 'Quantum Hamiltonian Descent for Non-smooth Optimization'
subtitle: 'From accelerated gradient dynamics to quantum exploration of non-smooth landscapes'
date: 2025-03-20
dateLabel: '20 Mar 2025'
keywords: ['Quantum Hamiltonian Descent', 'Non-Smooth Optimization', 'Non-Convex Optimization', 'Hamiltonian Dynamics']
highlight: 'Numerically Verified Advantage'
---

A classical optimization method usually follows one trajectory through the landscape. On a non-convex objective, that trajectory can enter a local basin with no straightforward way to cross the surrounding barrier. Quantum Hamiltonian Descent (QHD) instead evolves a probability distribution over the search space.

This note develops that idea in two stages. Part I follows the path from gradient descent to accelerated dynamics, Hamiltonian mechanics, and finally quantum evolution. Part II examines what happens numerically on non-smooth, non-convex benchmark problems. The emphasis is intuition: convergence proofs are left to [the paper](https://arxiv.org/abs/2503.15878).

<p class="qhd-part-label">Part I · From gradient descent to quantum dynamics</p>

## Gradient descent as a differential equation

Classical gradient descent updates its current point by

$$
x_{k+1}=x_k-\eta\nabla f(x_k),
$$

where $\eta>0$ is the step size. Rearranging gives

$$
\frac{x_{k+1}-x_k}{\eta}=-\nabla f(x_k).
$$

To interpret this as continuous motion, imagine a smooth curve $X(t)$ passing through the iterates, with $x_k\approx X(k\eta)$. We let $\eta\to0$ while holding the continuous time $t=k\eta$ fixed. Then

$$
\frac{x_{k+1}-x_k}{\eta}
\longrightarrow X'(t).
$$

At the same time, $x_k\to X(t)$. If $\nabla f$ is continuous, this also means

$$
\nabla f(x_k)\longrightarrow\nabla f(X(t)).
$$

This gives us the differential-equation interpretation of classical gradient descent:

$$
X'(t)=-\nabla f(X(t)).
$$

This continuous view also makes the downhill behavior transparent. By the multivariable chain rule,

$$
\begin{aligned}
\frac{d}{dt}f(X(t))
&=\nabla f(X(t))^\top X'(t)\\
&=-\lVert\nabla f(X(t))\rVert^2\\
&\leq0.
\end{aligned}
$$

The gradient measures how the objective changes with position, and $X'$ tells us how the position changes with time. Along gradient flow, their inner product is always non-positive, so the objective cannot increase. This position-and-velocity viewpoint prepares us for the accelerated dynamics below.

## Nesterov accelerated gradient descent

Nesterov's accelerated gradient descent (NAG) uses two related sequences:

$$
x_k=y_{k-1}-s\nabla f(y_{k-1}),
$$

$$
y_k=x_k+\frac{k-1}{k+2}(x_k-x_{k-1}).
$$

The first equation takes a gradient step from $y_{k-1}$. The second uses the recent displacement $x_k-x_{k-1}$ to extrapolate forward. Thus $y_k$ is a **look-ahead point**, and the next gradient is evaluated there.

The coefficient has a simple intuition:

$$
\frac{k-1}{k+2}=1-\frac{3}{k+2}.
$$

At $k=1$ it is zero, so the method begins cautiously without extrapolation. As $k$ grows, it approaches one, so NAG increasingly trusts its recent movement and extrapolates farther in that direction, helping accelerate the search.

This extra dependence on recent motion changes the nature of the continuous model. Gradient descent only needs the current position. NAG remembers how the position has been moving, so its continuous description needs position and velocity.

## From the NAG updates to the NAG ODE

Similar to the passage from classical gradient descent to gradient flow above, we can take a continuous-time limit of NAG. [Su, Boyd, and Candès](https://arxiv.org/abs/1503.01243) showed that the resulting ODE is

$$
X''(t)+\frac{3}{t}X'(t)+\nabla f(X(t))=0.
$$

The second derivative is natural: because NAG depends on both the current point and its recent displacement, its continuous state needs both position and velocity.

## A mechanical interpretation

Move the last two terms to the right:

$$
X''(t)
=-\nabla f(X(t))-\frac{3}{t}X'(t).
$$

This resembles the motion of a unit-mass particle:

- $X''(t)$ is its acceleration;
- $-\nabla f(X(t))$ is the force produced by the potential landscape $f$;
- $-\frac{3}{t}X'(t)$ is a viscous damping force.

The gradient is a derivative with respect to **position**, not time. If $f$ is potential energy, then moving in the direction $-\nabla f$ decreases that potential most rapidly. This is why the negative gradient behaves like a downhill force.

The damping term has a different reference direction: it is always opposite to the current velocity. It mirrors the classical viscous-friction law $F_{\mathrm{viscous}}=-cX'$, with the time-dependent coefficient $c=3/t$.

## Rewriting NAG as Hamiltonian dynamics

Sometimes it is useful to describe a dynamical system using **position and momentum** instead of position, velocity, and acceleration. For a unit-mass particle we would normally call $X'$ its momentum. Here, however, simply setting $P=X'$ would leave the damping term outside $P'$. We therefore look for a weighted momentum $P=\mu(t)X'$ whose derivative absorbs both $X''$ and $\frac{3}{t}X'$.

The product rule tells us exactly which weight works. Multiplying the NAG ODE by $t^3$ gives

$$
t^3X''+3t^2X'+t^3\nabla f(X)=0,
$$

and the first two terms combine as

$$
\left(t^3X'\right)'+t^3\nabla f(X)=0.
$$

This lets us define momentum by

$$
P=t^3X'.
$$

The second-order ODE is now the first-order position-momentum system

$$
X'=\frac{P}{t^3},
\qquad
P'=-t^3\nabla f(X).
$$

These equations are generated by the time-dependent **Hamiltonian**

$$
H(X,P,t)=\frac{1}{2t^3}\lVert P\rVert^2+t^3f(X).
$$

through Hamilton's equations

$$
X'=\frac{\partial H}{\partial P}=\frac{P}{t^3},
$$

$$
P'=-\frac{\partial H}{\partial X}=-t^3\nabla f(X).
$$

The familiar mechanical Hamiltonian $H=p^2/(2m)+V(x)$ is total energy. Its derivatives say $\partial H/\partial p=p/m=v$ and $-\partial H/\partial x=-V'(x)=F=p'$. The equations above have the same structure: differentiating with respect to momentum returns velocity, while the negative position derivative returns the momentum-changing force. Here the effective mass and potential scale with time, but the position-momentum interpretation is unchanged.

Its main benefit is structural. One second-order equation becomes two coupled first-order equations in $(X,P)$, which is the language that will later transfer naturally to quantum mechanics.

## The Legendre transformation and Lagrangian

The Hamiltonian uses position and momentum, $(X,P)$. What if we instead want to describe exactly the same system using position and velocity, $(X,X')$? We need to exchange the momentum variable for the velocity related to it. The **Legendre transformation** is the general mathematical tool for doing so.

A one-variable example shows the idea. Suppose

$$
F(v)=\frac12mv^2,
\qquad
p=F'(v)=mv.
$$

Because $p$ and $v$ are connected by differentiation, we can solve $v=p/m$ and define the transformed function

$$
F^*(p)=pv-F(v)=\frac{p^2}{2m}.
$$

The new function retains the same information in the new variable: $(F^*)'(p)=v$. The transformation does not change the physical trajectory; it changes which variable we use to describe it.

To move from a Hamiltonian back to a velocity-based description, solve

$$
X'=\frac{\partial H}{\partial P}
$$

for $P$, then define

$$
L(X,X',t)=P^\top X'-H(X,P,t).
$$

For the NAG Hamiltonian, $P=t^3X'$, so this gives

$$
L(X,X',t)
=t^3\left(\frac12\lVert X'\rVert^2-f(X)\right).
$$

In an ordinary mechanical system this is the familiar $L=T-V$, whereas the Hamiltonian is the energy-like quantity $H=T+V$. The Lagrangian lets us define a useful quantity called the **action**:

$$
S[X]=\int_{t_0}^{t_1}L(X,X',t)\,dt.
$$

The action helps us determine whether a candidate path is compatible with the physical rule: the system follows a path that makes the action **stationary**. With the endpoints fixed, every sufficiently small variation of that path has zero first-order effect on $S$. Intuitively, nature follows a dynamically balanced path—nearby alternatives cancel to first order—rather than consciously searching for the most energy-efficient route.

Write a nearby path as $X(t)+\epsilon h(t)$, where $h(t_0)=h(t_1)=0$. Differentiating the action with respect to $\epsilon$, evaluating at $\epsilon=0$, and integrating the velocity term by parts gives

$$
\delta S
=\int_{t_0}^{t_1}
\left(
\frac{\partial L}{\partial X}
-\frac{d}{dt}\frac{\partial L}{\partial X'}
\right)h(t)\,dt.
$$

For this expression to vanish for every allowable perturbation $h$, the physical path must satisfy the Euler-Lagrange equation

$$
\frac{d}{dt}\frac{\partial L}{\partial X'}
-\frac{\partial L}{\partial X}=0.
$$

This equation is not an identity for every curve. It characterizes the paths that make the chosen action stationary.

## The Bregman-Lagrangian framework

[Wibisono, Wilson, and Jordan](https://arxiv.org/abs/1603.04245) place the NAG ODE inside a more general family using the Bregman Lagrangian

$$
\mathcal L(X,X',t)
=e^{\alpha_t+\gamma_t}
\left(
\frac12\left\lVert e^{-\alpha_t}X'\right\rVert^2
-e^{\beta_t}f(X)
\right).
$$

The time-dependent functions $\alpha_t$, $\beta_t$, and $\gamma_t$ control the relative scaling of motion, potential, and damping. Applying the Euler-Lagrange equation produces

$$
X_t''+
(\gamma_t'-\alpha_t')X_t'+
e^{2\alpha_t+\beta_t}\nabla f(X_t)=0.
$$

NAG appears as the particular choice

$$
\alpha_t=-\log t,
\qquad
\beta_t=\gamma_t=2\log t.
$$

Indeed, substituting these choices recovers the NAG ODE. The value of the broader framework is that other choices of $\alpha_t$, $\beta_t$, and $\gamma_t$ generate other accelerated flows, letting one common construction describe algorithms beyond this particular NAG schedule.

Applying the Legendre transformation in reverse to this family produces its position-momentum form:

$$
\mathcal H(X,P,t)
=e^{\alpha_t+\gamma_t}
\left(
\frac12\left\lVert e^{-\gamma_t}P\right\rVert^2
+e^{\beta_t}f(X)
\right).
$$

## Quantum states and observables

In classical mechanics, a state can be represented by a definite position and momentum. A quantum state is instead described by a complex-valued wave function

$$
\Psi(t,x).
$$

Its normalization is

$$
\int_{\mathbb R^d}|\Psi(t,x)|^2\,dx=1,
$$

so $|\Psi(t,x)|^2$ can be interpreted as the probability density for a position measurement.

However, a quantum system still has measurable quantities such as position, momentum, and energy. In quantum mechanics, we call these quantities **observables**. Unlike in classical mechanics, we cannot simply read one definite stored value from the state; because the state is probabilistic, we need a new interpretation based on observable operators.

As a classical analogy, consider an arbitrary two-value probability mass function

$$
\Pr(A=0)=q,
\qquad
\Pr(A=1)=1-q.
$$

Its expected value is $\mathbb E[A]=0\cdot q+1\cdot(1-q)=1-q$. In the quantum setting, a **self-adjoint operator** $\hat A$ is the tool that lets us calculate the expected value of the target observable from the state using an inner product:

$$
\langle\hat A\rangle_\Psi
=\langle\Psi,\hat A\Psi\rangle
=\int_{\mathbb R^d}
\overline{\Psi(x)}(\hat A\Psi)(x)\,dx.
$$

For example, to see what an observable operator looks like, suppose an observable has two possible values, $0$ and $1$. In the corresponding two-state basis, its operator is

$$
\hat A=
\begin{pmatrix}
0&0\\
0&1
\end{pmatrix},
$$

or equivalently,

$$
\hat A|0\rangle=0|0\rangle,
\qquad
\hat A|1\rangle=1|1\rangle.
$$

If

$$
|\Psi\rangle=\sqrt{0.25}\,|0\rangle+\sqrt{0.75}\,|1\rangle,
$$

then the two outcomes occur with probabilities $0.25$ and $0.75$. Applying the operator and taking the inner product gives

$$
\langle\Psi|\hat A|\Psi\rangle
=0(0.25)+1(0.75)=0.75,
$$

exactly the familiar probability-weighted average.

## Position and momentum operators

Our goal is to measure the position and momentum of a quantum state. A classical particle stores definite numbers $X$ and $P$, but a wave function stores amplitudes across possible outcomes, so we need the observable-operator viewpoint developed above.

The position operator follows directly from the usual mean of a continuous probability distribution. Because position has density $|\Psi(x)|^2$, we want

$$
\langle X\rangle=\int x|\Psi(x)|^2\,dx
=\int\overline{\Psi(x)}\,x\Psi(x)\,dx.
$$

Therefore the operator acting inside the inner product must multiply by the coordinate:

$$
(\hat x_j\varphi)(x)=x_j\varphi(x).
$$

Momentum is less direct because it cannot be read from the position probability density. In the position representation, canonical quantization defines it by

$$
(\hat p_j\varphi)(x)=-i\partial_{x_j}\varphi(x).
$$

Intuitively, the derivative measures how the wave function changes across space. Momentum can also be viewed as the **generator of spatial translation**.

A small spatial displacement $a$ acts on a wave function through the translation operator

$$
(T(a)\Psi)(x)=\Psi(x-a).
$$

A first-order Taylor expansion gives

$$
\Psi(x-a)\approx\Psi(x)-a\cdot\nabla\Psi(x).
$$

In quantum mechanics, a continuous transformation generated by momentum is written

$$
T(a)=e^{-ia\cdot\hat p/\hbar}
\approx I-\frac{i}{\hbar}a\cdot\hat p.
$$

Comparing the two first-order expressions gives

$$
\hat p=-i\hbar\nabla,
$$

or $\hat p=-i\nabla$ in the $\hbar=1$ convention used here.

## Quantizing the classical Hamiltonian

With the position and momentum operators derived above, we are ready to transform the Bregman Hamiltonian into its quantum counterpart. Substituting those operators produces

$$
\hat H(t)
=e^{\alpha_t-\gamma_t}
\left(-\frac12\Delta\right)
+e^{\alpha_t+\beta_t+\gamma_t}f(x),
$$

where

$$
\Delta=\sum_{j=1}^d\partial_{x_j}^2
$$

is the Laplacian. The two terms have familiar roles:

- $-\frac12\Delta$ is the **kinetic operator**, which promotes spatial spreading and motion;
- $f(x)$ is the **potential operator**, which multiplies the wave function by the objective landscape.

The quantum Hamiltonian is itself a self-adjoint observable. Its expected value is

$$
\langle\hat H(t)\rangle_\Psi
=\langle\Psi,\hat H(t)\Psi\rangle,
$$

which corresponds to expected kinetic plus potential energy in a familiar mechanical system.

## The Hamiltonian as a generator

The Hamiltonian has a second role: it determines how the quantum state changes with time through the Schrödinger equation

$$
i\partial_t\Psi(t,x)=\hat H(t)\Psi(t,x).
$$

For a time-independent Hamiltonian,

$$
U(t)=e^{-it\hat H},
\qquad
\Psi(t)=U(t)\Psi(0).
$$

Differentiating at $t=0$ gives

$$
\left.
\frac{d}{dt}U(t)\Psi(0)
\right|_{t=0}
=-i\hat H\Psi(0).
$$

The Hamiltonian is therefore the **generator** of time evolution: it is the fixed linear rule that produces the instantaneous derivative vector. It is not itself that derivative vector.

A caveat is important here: being self-adjoint does not make an operator intrinsically “the Hamiltonian.” Any suitable self-adjoint operator $\hat A$ generates a unitary family $e^{-is\hat A}$, and one could choose it to define an evolution in the parameter $s$. Once a particular operator is chosen to govern the system's physical time evolution through the Schrödinger equation, we call that operator the **Hamiltonian**. In the mechanical model used here, that chosen generator is also the energy observable.

## How QHD becomes an optimization algorithm

The preceding ingredients lead to a simple operational picture:

1. Prepare a normalized initial wave function.
2. Construct the quantum Hamiltonian using the objective $f(x)$ as its potential.
3. Evolve the state according to the Schrödinger equation.
4. Let the kinetic and potential operators reshape the wave function.
5. Measure the final position.
6. Treat the measured position as a candidate solution.
7. Repeat to obtain additional candidates.

Compared with a single classical trajectory, the quantum formulation offers several useful mechanisms:

- **Distribution-wide exploration:** the wave function carries amplitude across many regions of the search space at once rather than committing immediately to one trajectory.
- **Tunneling across barriers:** amplitude can pass through a potential barrier that would trap a classical trajectory without enough energy to cross it.
- **Interference between routes:** amplitudes arriving by different paths can reinforce promising regions or cancel elsewhere.

<p class="qhd-part-label">Part II · Numerical results</p>

## From quantum dynamics to an empirical question

The mechanics above give QHD ways to redistribute probability that are unavailable to a single classical trajectory. Do those dynamics actually produce better candidate distributions on difficult non-smooth, non-convex landscapes?

## Experimental setup

<aside class="qhd-setup">
  <strong>Matched numerical comparison</strong>
  <ul>
    <li>12 non-smooth, non-convex functions</li>
    <li>One-, two-, and three-variable cases</li>
    <li>QHD, Subgrad, and LFMSGD</li>
    <li>10,000 relevant oracle queries per run</li>
    <li>N = 512, T = 10, and h = 10⁻³ for QHD</li>
    <li>k ∈ {1, 3, 10, 30, 100} sampled outputs</li>
  </ul>
</aside>

The study uses a classical simulation of discrete-time QHD. QHD receives 10,000 function-value queries per run; Subgrad and LFMSGD receive 10,000 subgradient queries. The classical baselines are evaluated from 10,000 uniformly initialized independent runs.

For QHD, the objective domain is rescaled to a hypercube $[-L,L]^d$, with $\lambda(t)=t^3$, total evolution time $T=10$, time step $h=1/1000$, and spatial resolution $N=512$. The authors use the convex-style $t^3$ schedule because it performs better empirically here than the schedule motivated by the non-convex theory. The primary parameter of each method is tuned separately with Bayesian optimization.

Note that these are simulations of quantum dynamics on a classical computer, not runs on quantum hardware.

## The best-of-k optimality gap

All three methods contain randomness, either through measurement, random initialization, or injected noise. The paper therefore uses the expected best result among $k$ independent outputs:

$$
\mathbb E\left[
\min_{1\leq i\leq k}
\bigl(f(\widetilde X_i)-f_{\min}\bigr)
\right].
$$

Here $k$ is the number of independent outputs or restarts, **not** the number of optimization iterations. A smaller gap means that after $k$ attempts, the method is more likely to have produced a point near the known global optimum.

For the classical methods, the expectation is estimated through Monte Carlo sampling. Because the classical QHD simulation exposes its complete final probability distribution, its best-of-$k$ gap can be computed directly from that distribution.

## Overall benchmark results

QHD obtains the lowest gap for every tested $k$ on 8 of the 12 functions. The strongest separations occur on WF, XINSHEYANG04, and DROPWAVE, where the QHD gap falls by multiple additional orders of magnitude as $k$ increases.

<qhd-benchmark-chart>
  <p>The interactive chart compares QHD, LFMSGD, and Subgrad on all 12 benchmarks. The published values are available in Table 3 of the referenced paper.</p>
</qhd-benchmark-chart>

XINSHEYANG04 gives a representative numerical result. At $k=100$, the reported gaps are

$$
\begin{aligned}
\text{QHD} &: 1.27\times10^{-16},\\
\text{LFMSGD} &: 2.67\times10^{-2},\\
\text{Subgrad} &: 3.14\times10^{-2}.
\end{aligned}
$$

Within this simulation, the QHD gap is roughly 14 orders of magnitude smaller than the better classical baseline. This is a solution-quality comparison under the study's query protocol, not a claim about wall-clock time or quantum hardware speedup.

## XINSHEYANG04 through time

XINSHEYANG04 is a multimodal two-dimensional landscape whose global minimum lies at its center. It provides a useful case study because we can watch the output distribution change instead of looking only at the final score.

<figure class="qhd-landscape">
  <img src="/images/qhd/xinsheyang04-landscape.png" width="1100" height="500" loading="lazy" alt="Three-dimensional surface and heat map of the XINSHEYANG04 objective, with its global minimum marked at the center">
  <figcaption>The XINSHEYANG04 landscape. Lower values appear around the marked central global minimum, surrounded by many competing basins. Reproduced from Figure 5 of the paper.</figcaption>
</figure>

<qhd-evolution>
  <p>Figure 6 of the paper compares QHD, Subgrad, and LFMSGD at iterations 10, 100, 1,000, 2,500, and 10,000.</p>
</qhd-evolution>

The QHD distribution begins in a highly fluctuating kinetic phase. It then redistributes mass across the landscape, preserves broad exploration, and finally forms a sharp peak at the center. The subgradient distribution remains split among the basins reached from its random initial points. LFMSGD progressively concentrates, but retains a wider residual spread.

## What the experiments establish

The experiments support a measured conclusion:

- QHD evolves a candidate distribution rather than one optimization trajectory.
- Under the study's query protocol, that distribution produces substantially smaller best-of-$k$ gaps on several difficult landscapes.
- The XINSHEYANG04 sequence numerically demonstrates broad exploration followed by strong localization.
- The advantage depends on the landscape, schedule, and numerical resolution; on some problems, QHD's advantage is less significant.

## References

1. Jiaqi Leng, Yufan Zheng, Zhiyuan Jia, Lei Fan, Chaoyue Zhao, Yuxiang Peng, and Xiaodi Wu. “Quantum Hamiltonian Descent for Non-smooth Optimization.” *arXiv preprint arXiv:2503.15878*, 2025. [Read on arXiv](https://arxiv.org/abs/2503.15878).
2. Weijie Su, Stephen Boyd, and Emmanuel J. Candès. “A Differential Equation for Modeling Nesterov's Accelerated Gradient Method: Theory and Insights.” *Journal of Machine Learning Research* 17, 2016. [Read on arXiv](https://arxiv.org/abs/1503.01243).
3. Andre Wibisono, Ashia C. Wilson, and Michael I. Jordan. “A Variational Perspective on Accelerated Methods in Optimization.” *Proceedings of the National Academy of Sciences* 113(47), 2016. [Read on arXiv](https://arxiv.org/abs/1603.04245).
