---
title: 'Interior-Point Methods for Linear Programming'
subtitle: 'A barrier, a free dual certificate, and Newton’s method on a moving target'
date: 2026-11-08
keywords: ['Linear Programming', 'Interior-Point Methods', 'Duality', 'Newton’s Method']
highlight: 'Study Notes'
---

The simplex method solves a linear program by walking along the edges of the feasible region, from corner to better corner. Interior-point methods cut through the middle instead. These notes build the method from one idea: replace every hard constraint with a soft barrier, find the best point of the softened problem, then weaken the barrier and repeat. Duality tells us how far each of these points is from optimal, and Newton’s method, started from the previous answer, makes each repeat cheap.

## The idea in one picture

A small made-up example runs through these notes. A data center has spare capacity for the next hour and two kinds of batch work waiting. Each unit of job type A earns 3 thousand dollars and needs 0.5 MW of power and 100 machines; each unit of type B earns 4 thousand dollars and needs 1 MW and 50 machines. The site has 6 MW and 600 machines to spare, and 5 units of each type are waiting. With $x_1$ and $x_2$ the units of A and B to run,

<span id="eq:job-mix"></span>

$$
\begin{aligned}
\text{maximize}\quad & 3x_1+4x_2 && \text{revenue (thousand \$)}\\
\text{subject to}\quad & 0.5x_1+x_2\leq 6 && \text{power (MW)}\\
& x_1+0.5x_2\leq 6 && \text{machines (hundreds)}\\
& x_1\leq 5,\quad x_2\leq 5 && \text{work waiting}\\
& x_1\geq 0,\quad x_2\geq 0.
\end{aligned}
\tag{1}
$$

The best plan is $x=(4,4)$, worth 28, which uses all of the power and all of the machines. Starting at the origin, the simplex method can reach it in three moves between corners of the feasible region: from $(0,0)$ to $(0,5)$, then $(2,5)$, then $(4,4)$, with values 0, 20, 26, and 28.

An interior-point method keeps away from the walls. Picture each constraint as a wall that pushes the current point away, with a strength set by a number $\mu>0$. When the push is strong, the best compromise between earning revenue and staying clear of the walls lies deep inside the region. As $\mu$ shrinks, the walls matter less and revenue matters more, and the compromise slides toward the optimal corner. The curve traced by these compromise points is the **central path**.

<figure class="ipm-figure">
  <img src="/images/interior-point/central-path.svg" alt="The feasible region of the job-mix problem, a hexagon with corners (0, 0), (5, 0), (5, 2), (4, 4), (2, 5), and (0, 5). Dashed arrows trace the simplex path along the edges from (0, 0) up to (0, 5), right to (2, 5), and down the power edge to (4, 4). A solid curve, the central path, starts at the analytic center near (1.47, 1.47) and bends up to the optimum at (4, 4), with points marked for mu equal to 10, 1, and 0.1." width="659" height="642" loading="lazy" />
  <figcaption>Figure 1. The simplex method walks along the edges (dashed); the central path crosses the interior (solid). For very large μ the path starts at the analytic center of the region, the point that maximizes the product of all six slacks. It passes through (1.90, 2.16) at μ = 10, (3.31, 3.96) at μ = 1, and (3.92, 4.01) at μ = 0.1, and it approaches (4, 4) without reaching it.</figcaption>
</figure>

This picture raises three questions. How good is each point on the path? How do we compute one? And why is following the path cheap? Duality answers the first, Newton’s method the second, and a scaling argument the third.

## Primal, dual, and barrier problems

Write a general linear program in inequality form, with $n$ variables and $m$ constraints:

<span id="eq:primal"></span>

$$
\text{(P)}\qquad
\text{maximize}\ \ c^\top x
\qquad\text{subject to}\qquad
a_i^\top x\leq b_i,\quad i=1,\ldots,m.
\tag{2}
$$

The rows $a_i^\top$ form the matrix $A$, so the constraints read $Ax\leq b$. Sign constraints are included as rows $-x_j\leq 0$. The **slack** of constraint $i$ is $s_i(x)=b_i-a_i^\top x$, the amount of room left before the constraint binds. The job mix has $n=2$ and $m=6$:

$$
A=\begin{bmatrix}0.5&1\\1&0.5\\1&0\\0&1\\-1&0\\0&-1\end{bmatrix},
\qquad
b=\begin{bmatrix}6\\6\\5\\5\\0\\0\end{bmatrix},
\qquad
c=\begin{bmatrix}3\\4\end{bmatrix}.
$$

Every linear program has a **dual**. For (P), it attaches a price $\lambda_i\geq 0$ to each constraint:

<span id="eq:dual"></span>

$$
\text{(D)}\qquad
\text{minimize}\ \ b^\top\lambda
\qquad\text{subject to}\qquad
A^\top\lambda=c,\quad \lambda\geq 0.
\tag{3}
$$

Read $\lambda_i$ as the value of one more unit of resource $i$. The objective $b^\top\lambda$ is the total value of all available resources at these prices. The constraint $A^\top\lambda=c$ writes the revenue vector as a nonnegative combination of the constraint rows; the prices on the sign rows absorb any excess, so it says that the resources one unit of each job uses are priced at least at that job’s revenue. For the job mix, the optimal prices are $\lambda^*=(10/3,\,4/3,\,0,\,0,\,0,\,0)$: an extra MW is worth 10/3 thousand dollars, an extra hundred machines 4/3, and the limits that do not bind are worth nothing. The dual optimum is $6\cdot 10/3+6\cdot 4/3=28$, the same as the primal optimum.

The interior-point method replaces (P) by the **barrier problem**

<span id="eq:barrier"></span>

$$
\text{(B}_\mu\text{)}\qquad
\text{maximize}\ \ c^\top x+\mu\sum_{i=1}^{m}\log s_i(x),
\qquad \mu>0.
\tag{4}
$$

The logarithm is the soft wall: $\log s_i\to-\infty$ as $s_i\to 0$, so the maximizer stays strictly inside the feasible region, and $\mu$ sets the strength of the push. Assume (P) has a strictly feasible point and a bounded feasible region. Then (B<sub>μ</sub>) has exactly one maximizer $x(\mu)$ for each $\mu>0$, because its objective is strictly concave (the sign rows give $A$ full column rank). The central path is the curve $\{x(\mu):\mu>0\}$.

## The zero-slope equation and a free dual point

The objective of (B<sub>μ</sub>) is smooth and concave, so $x(\mu)$ is the point where its gradient vanishes. The derivative of $\log s_i(x)=\log(b_i-a_i^\top x)$ is $-a_i/s_i(x)$, so the zero-slope condition is

<span id="eq:zero-slope"></span>

$$
c-\sum_{i=1}^{m}\frac{\mu}{s_i(x)}\,a_i=0
\qquad\Longleftrightarrow\qquad
c=\sum_{i=1}^{m}\frac{\mu}{s_i(x)}\,a_i.
\tag{5}
$$

This equation is what the method has to solve. Its shape is worth a second look: it writes $c$ as a combination of the constraint rows $a_i$ with positive weights. The dual constraint $A^\top\lambda=c$ asks for exactly that, $c=\sum_i\lambda_i a_i$ with $\lambda\geq 0$. So the weights themselves form a dual solution. Define

<span id="eq:dual-point"></span>

$$
\lambda_i(\mu)=\frac{\mu}{s_i(x(\mu))},
\qquad\text{equivalently}\qquad
\lambda_i(\mu)\,s_i(x(\mu))=\mu,
\qquad i=1,\ldots,m.
\tag{6}
$$

Each $\lambda_i(\mu)$ is positive, and Equation [(5)](#eq:zero-slope) says $A^\top\lambda(\mu)=c$. Every point on the central path therefore comes with a feasible dual solution at no extra cost.

The second form of Equation [(6)](#eq:dual-point) has a name. At an optimal pair, **complementary slackness** requires $\lambda_i^*s_i^*=0$ for every $i$: a constraint with a positive price must bind, and a constraint with room left must have price zero. The central path satisfies primal feasibility, dual feasibility, and a relaxed version of complementary slackness in which every product equals $\mu$ instead of zero. Letting $\mu\to 0$ recovers all the optimality conditions.

On the job mix at $\mu=1$, the path point is $x(1)=(3.31,\,3.96)$. Its power and machine slacks are 0.39 and 0.71, which give prices $\lambda_1=2.59$ and $\lambda_2=1.41$. At $\mu=0.001$, the prices are 3.3328 and 1.3328, close to the optimal 10/3 and 4/3.

## Weak duality: every dual point is a certificate

Take any feasible $x$ and any feasible $\lambda$. Since $\lambda_i\geq 0$ and $a_i^\top x\leq b_i$,

<span id="eq:weak-duality"></span>

$$
c^\top x=(A^\top\lambda)^\top x=\sum_{i=1}^{m}\lambda_i\,a_i^\top x\leq\sum_{i=1}^{m}\lambda_i b_i=b^\top\lambda.
\tag{7}
$$

This is **weak duality**: the value of every feasible plan is at most the value of every feasible set of prices. In particular, the optimal value $p^*$ of (P) satisfies $p^*\leq b^\top\lambda$ for any dual feasible $\lambda$. Applied to the central path,

$$
c^\top x(\mu)\leq p^*\leq b^\top\lambda(\mu).
$$

A point on the path is therefore more than an interior point. It comes with a certificate that brackets the unknown optimum from both sides.

## The duality gap is exactly mμ

The width of that bracket is the **duality gap**. For any $x$ and any $\lambda$ with $A^\top\lambda=c$,

<span id="eq:gap"></span>

$$
b^\top\lambda-c^\top x=b^\top\lambda-\lambda^\top Ax=\lambda^\top(b-Ax)=\sum_{i=1}^{m}\lambda_i\,s_i(x).
\tag{8}
$$

On the central path, every product $\lambda_i s_i$ equals $\mu$ by Equation [(6)](#eq:dual-point), so the gap is $m\mu$ and

<span id="eq:bound"></span>

$$
p^*-c^\top x(\mu)\leq m\mu.
\tag{9}
$$

The point $x(\mu)$ is within $m\mu$ of optimal, one $\mu$ per constraint, whatever $A$, $b$, and $c$ are.

The gap also has an economic reading. Each term $\lambda_i s_i$ is a price times an unused amount, the value of resource $i$ left idle. The duality gap is the total value of everything the plan leaves unused, and on the central path the barrier keeps exactly $\mu$ worth of each constraint idle.

For the job mix, $m=6$:

| $\mu$ | $x(\mu)$ | $c^\top x(\mu)$ | $b^\top\lambda(\mu)$ | Gap |
| ---: | :---: | ---: | ---: | ---: |
| 10 | (1.90, 2.16) | 14.333 | 74.333 | 60 |
| 1 | (3.31, 3.96) | 25.769 | 31.769 | 6 |
| 0.1 | (3.92, 4.01) | 27.795 | 28.395 | 0.6 |
| 0.001 | (3.9992, 4.0001) | 27.998 | 28.004 | 0.006 |

The gap is always exactly $6\mu$. The true distance to 28 is smaller (2.23 at $\mu=1$), so the bound is not tight, but it can be checked without knowing $p^*$.

## Why not jump straight to a tiny μ?

Equation [(9)](#eq:bound) suggests a one-step recipe: choose an accuracy $\varepsilon$, set $\mu=\varepsilon/m$, and solve Equation [(5)](#eq:zero-slope) once. Two obstacles stand in the way.

First, Equation [(5)](#eq:zero-slope) is a system of $n$ nonlinear equations, since $x$ appears in denominators through the slacks. Apart from tiny cases, it has no closed-form solution, so it has to be solved iteratively. The natural tool for a system of equations is Newton’s method.

Second, Newton’s method is fast near a solution and unreliable far from one. With a tiny $\mu$, the solution $x(\mu)$ is pressed against the walls: on the job mix at $\mu=0.001$, the power slack is only 0.0003. From a starting point in the middle of the region, Newton’s linear approximations are trustworthy only over short distances once the iterates near the walls, so its steps must be cut short, often many times. Small problems can be forgiving: on the job mix, solving directly with $\mu=10^{-6}$ from $(1,1)$ takes 14 Newton steps, 10 of them shortened. In general, though, the standard bound on the number of Newton steps for a single solve, which follows from the analysis in Boyd and Vandenberghe (2004, §9.6.4), grows in proportion to $1/\mu$. Boyd and Vandenberghe note that the direct approach can work for small problems, good starting points, and moderate accuracy, but not otherwise, which is why it is rarely used (§11.3).

The remedy is to approach the target gradually. Solve (B<sub>μ</sub>) for a moderate $\mu_0$, reduce it to $\mu_1=\mu_0/\kappa$ for some factor $\kappa>1$, solve again starting from $x(\mu_0)$, and repeat. This is the **barrier method**, also called **path following**. When Fiacco and McCormick proposed it in the 1960s, they called it the sequential unconstrained minimization technique (Boyd and Vandenberghe, 2004, §11.3.1). The idea is that each new solution is close to the previous one, so each solve should take only a few Newton steps. To see why that works, we first need Newton’s method itself.

## Newton’s method in brief

To find a zero of a function $g$ of one variable, Newton’s method replaces $g$ by its tangent line at the current guess and jumps to where the tangent crosses zero:

<span id="eq:newton-1d"></span>

$$
x_{k+1}=x_k-\frac{g(x_k)}{g'(x_k)}.
\tag{10}
$$

<figure class="ipm-figure">
  <img src="/images/interior-point/newton-1d.svg" alt="The curve g of x equals x squared minus 2. From x0 = 3, the tangent line drops to the axis at x1 about 1.83; the tangent at x1 drops to x2 about 1.46, already close to the root at the square root of 2." width="791" height="520" loading="lazy" />
  <figcaption>Figure 2. Newton’s method on g(x) = x² − 2, starting from x₀ = 3. Each step follows the tangent line to the axis. The errors are 1.59, 0.42, 0.048, 0.00079, and 0.00000022 after zero to four steps.</figcaption>
</figure>

The errors in Figure 2 show the method’s defining property. Near the root, each step roughly squares the error, so the number of correct digits about doubles per step. This is **quadratic convergence**, and it holds only near the root. Far away, the tangent can be a poor model, and a full step can overshoot. The usual safeguard is a **damped** step $x_k+t\,\Delta x$ with $t\in(0,1]$, shortened until it makes enough progress.

For a system of $n$ equations $g(x)=0$ in $n$ unknowns, the tangent line becomes the linearization $g(x+\Delta x)\approx g(x)+J(x)\,\Delta x$, where $J$ is the Jacobian matrix of $g$. Setting the linearization to zero gives the Newton step:

<span id="eq:newton-system"></span>

$$
J(x_k)\,\Delta x=-g(x_k),
\qquad
x_{k+1}=x_k+t\,\Delta x.
\tag{11}
$$

Each Newton step costs one linear solve, and the local behavior is the same as in one dimension.

For the barrier problem, $g(x)=c-\sum_i\mu\,a_i/s_i(x)$. Differentiating $1/s_i(x)$ gives $a_i/s_i(x)^2$, so $J(x)=-\sum_i\mu\,a_ia_i^\top/s_i(x)^2$, and the Newton step solves

<span id="eq:newton-barrier"></span>

$$
\left(\sum_{i=1}^{m}\frac{\mu}{s_i^2}\,a_ia_i^\top\right)\Delta x
=c-\sum_{i=1}^{m}\frac{\mu}{s_i}\,a_i,
\qquad\text{that is,}\qquad
A^\top\operatorname{diag}\!\left(\frac{\lambda_i}{s_i}\right)A\,\Delta x=g(x),
\tag{12}
$$

where $s_i=s_i(x)$ and $\lambda_i=\mu/s_i$ at the current point. The matrix is $n\times n$, symmetric, and positive definite. Here the step length $t$ has a second job: it must also keep every slack positive.

## Getting started

The barrier method needs a strictly feasible starting point. If none is obvious, a **phase I** problem finds one. Add one variable $r$ and solve

<span id="eq:phase-one"></span>

$$
\text{minimize}\ \ r
\qquad\text{subject to}\qquad
a_i^\top x-b_i\leq r,\quad i=1,\ldots,m.
\tag{13}
$$

Any $x$, such as $x=0$, together with $r$ slightly larger than $\max_i\,(a_i^\top x-b_i)$, is strictly feasible for this problem, so the barrier method can run on it directly. As soon as $r<0$, the current $x$ satisfies every original constraint strictly, and phase I can stop. If the optimal $r$ is nonnegative, (P) has no strictly feasible point (Boyd and Vandenberghe, 2004, §11.4.1). Phase II is then the barrier method itself, started from that point. The point does not need to lie on the central path: the first stage simply runs Newton’s method on (B<sub>μ₀</sub>) from wherever phase I ended. Because $m\mu_0$ is the duality gap after that first stage, a reasonable $\mu_0$ makes $m\mu_0$ about as large as the starting point’s distance from optimal (Boyd and Vandenberghe, 2004, §11.3.1).

Practical solvers use a **primal-dual** variant. It treats $x$, $s$, and $\lambda$ all as unknowns and applies Newton’s method to the full system

$$
Ax+s=b,
\qquad
A^\top\lambda=c,
\qquad
\lambda_i s_i=\mu\quad(i=1,\ldots,m),
$$

while keeping $s>0$ and $\lambda>0$. The two linear equations need not hold at the start: **infeasible-start** methods let the Newton steps drive their residuals to zero along the way (Bertsimas and Tsitsiklis, 1997, §9.5). The starting point then only has to be positive, which is easy to arrange. Mehrotra’s widely used heuristic takes least-squares solutions of the linear equations and shifts their entries until they are safely positive (Mehrotra, 1992). A **homogeneous self-dual** formulation goes further: it embeds the primal and dual problems in one larger linear program with a known interior point, so it can start anywhere and also detects infeasibility (Bertsimas and Tsitsiklis, 1997, §9.5).

## The equation keeps changing

In its textbook form, Newton’s method solves one fixed equation: pick a starting guess and iterate. Its fast convergence is guaranteed only near the root.

Path following asks for something different. Every stage changes the equation, from $g_\mu$ to $g_{\mu/\kappa}$, where $g_\mu(x)=c-\sum_i\mu\,a_i/s_i(x)$ is the left side of Equation [(5)](#eq:zero-slope), and the root moves from $x(\mu)$ to $x(\mu/\kappa)$. Each stage starts from the previous root, which is not a root of the new equation. The method works only if the old root lies in the region where Newton’s method converges quickly on the new equation, at every stage, including late stages when everything is crowded into a tiny neighborhood of the optimal corner.

Absolute distances cannot settle this. Late in the run, the root moves only a tiny distance per stage, but the room to move is just as tiny: the binding walls are only a distance proportional to $\mu$ away. The right comparison is relative to the walls.

## Relative units: why the old answer stays a good start

Measure a move by how much it changes each slack relative to that slack’s current size, $|\Delta s_i|/s_i$. In these units, two facts make path following work.

**Fact 1: shrinking μ moves the root by a fixed fraction of the room.** As $\mu\to 0$, the path point $x(\mu)$ converges to an optimal solution and $\lambda(\mu)$ to an optimal dual solution. For a binding constraint whose optimal price $\lambda_i^*$ is positive, Equation [(6)](#eq:dual-point) gives $s_i=\mu/\lambda_i(\mu)\approx\mu/\lambda_i^*$. The slack is proportional to $\mu$, so dividing $\mu$ by $\kappa$ divides the slack by $\kappa$. For a constraint that has room left at the optimum, the slack settles at its final positive value and barely changes. The limit of the central path is strictly complementary, meaning every constraint has either a positive optimal price or room left (Bertsimas and Tsitsiklis, 1997, §9.5), so these two cases cover every constraint. Either way, one stage changes each slack by at most about the fraction $1-1/\kappa$ of itself, whether $\mu$ is 1 or $10^{-6}$.

The job mix shows this with $\kappa=2$, starting from $x(1)$. The table lists, for each stage, the ratio of each slack to its value at the previous stage, the Newton steps needed, and the Newton decrement $\delta$ at the start of the stage, a measure explained below.

| $\mu$ | Power slack ratio | Machine slack ratio | $x_1\leq 5$ slack ratio | Newton steps | $\delta$ at start |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1/2 | 0.438 | 0.543 | 0.830 | 4 | 1.542 |
| 1/4 | 0.467 | 0.511 | 0.864 | 4 | 1.496 |
| 1/8 | 0.486 | 0.495 | 0.913 | 4 | 1.472 |
| 1/16 | 0.494 | 0.493 | 0.952 | 3 | 1.451 |
| 1/64 | 0.499 | 0.497 | 0.988 | 3 | 1.425 |
| 1/256 | 0.500 | 0.499 | 0.997 | 3 | 1.417 |
| 1/1024 | 0.500 | 0.500 | 0.999 | 2 | 1.415 |
| 1/16384 | 0.500 | 0.500 | 1.000 | 2 | 1.414 |

The two binding slacks settle at half their previous values, the non-binding slack stops changing, and the work per stage settles at two Newton steps. Figure 3 shows the same thing geometrically.

<figure class="ipm-figure ipm-figure-tall">
  <img src="/images/interior-point/zoom.svg" alt="Two stacked panels near the optimal corner (4, 4), where the power wall and the machines wall meet. The top panel shows path points for mu equal to 0.08, 0.04, 0.02, and 0.01, joined by arrows for the Newton steps between them. The bottom panel shows mu equal to 0.0008 down to 0.0001, in a window 100 times smaller. The two panels look identical apart from the axis labels." width="703" height="868" loading="lazy" />
  <figcaption>Figure 3. Path following near the optimal corner with κ = 2. Green dots are path points; orange arrows are Newton steps, the first long one followed by short corrections. The bottom panel shows μ 100 times smaller in a window 100 times smaller. Apart from the axis labels, the two pictures are the same.</figcaption>
</figure>

**Fact 2: Newton’s reliable range is measured in the same units.** The curvature of the barrier term in a direction $d$ is $-\sum_i(a_i^\top d)^2/s_i^2$. Since $a_i^\top d=-\Delta s_i$, each constraint contributes the square of its relative slack change. This defines a local norm,

<span id="eq:local-norm"></span>

$$
\|d\|_x=\left(\sum_{i=1}^{m}\left(\frac{a_i^\top d}{s_i(x)}\right)^2\right)^{1/2}.
\tag{14}
$$

Every point $x+d$ with $\|d\|_x<1$ is strictly feasible: each term is then below 1, so $|a_i^\top d|<s_i$ and no slack can reach zero. This ellipsoid, the **Dikin ellipsoid**, fits inside the feasible region and grows or shrinks with the room around $x$. Within a fixed fraction of it, the curvature of the logarithmic barrier changes by at most a bounded factor, a consequence of a property of the logarithm called **self-concordance**, so Newton’s quadratic model stays accurate there. The convergence theory for self-concordant functions measures progress with the **Newton decrement** $\delta(x)$, the length of the Newton step in this local norm. It guarantees quadratic convergence once $\delta$ falls below a fixed constant, with no dependence on the problem’s scale (Boyd and Vandenberghe, 2004, §9.6).

Together, the two facts close the argument. The root moves by a fixed relative amount per stage, and Newton’s reliable region is defined in the same relative terms, so to Newton’s method the jump looks the same at every stage. On the job mix, $\delta$ at the start of each stage settles near $\sqrt 2\approx 1.414$, the steps per stage settle at two, and zooming in 100 times reproduces the same picture.

How large can $\kappa$ be? At the old root, Equation [(5)](#eq:zero-slope) turns the new problem’s Newton step into $\kappa-1$ times a step that depends only on the barrier, and that step never has local-norm length above $\sqrt m$. So the Newton decrement at the start of a stage is at most $(\kappa-1)\sqrt m$. A factor of the form $\kappa=1+c/\sqrt m$ with a small constant $c$ therefore starts every stage inside the quadratic-convergence zone, and every stage needs only a bounded number of Newton steps. Boyd and Vandenberghe’s analysis uses $\kappa=1+1/\sqrt m$ and reaches the same conclusion (2004, §11.5). Such factors are cautious. Larger ones start outside the zone, so the first step or two of each stage are damped. On the job mix with $\kappa=2$, where the bound is $\sqrt 6\approx 2.45$ and the actual decrement about 1.41, the first step of every stage is shortened, yet each stage still takes only two to four steps. Boyd and Vandenberghe report that for $\kappa$ between about 3 and 100, fewer stages and more steps per stage nearly cancel, so the total number of Newton steps stays roughly constant; they suggest values from about 10 to 20 (§11.3.1). Modern primal-dual solvers instead choose the reduction adaptively at every iteration. Mehrotra’s predictor–corrector method first checks how far a step aimed directly at $\mu=0$ could go before hitting a wall, then cuts $\mu$ aggressively if that step goes far and gently if it is blocked early (Mehrotra, 1992).

## The end of the path and crossover

The central path approaches the optimal set but never reaches it, so an interior-point method never lands exactly on a corner. When the optimum is unique, $x(\mu)$ converges to that corner. When the optimal set is a whole edge or face, the path ends at the face’s **analytic center**, which maximizes the sum of the logarithms of the slacks that stay positive across the face. If the job mix earned 1 and 2 per unit instead of 3 and 4, every point on the edge from $(2,5)$ to $(4,4)$ would earn 12. The central path for those revenues ends at $(2.88384,\,4.55808)$, not at either corner and not at the midpoint $(3,\,4.5)$. The simplex method would return a corner.

Many uses need a corner: an optimal **basic feasible solution**, in which the binding constraints are identified exactly, is what sensitivity analysis and re-optimization from a previous solution build on. A **crossover** algorithm therefore moves from the interior-point answer to a nearby basic feasible solution and from there to an optimal one. Its simplex-like iterations can become the bottleneck of an interior-point solve (Hillier and Lieberman, 2024, p. 200).

## Complexity, and a comparison with the simplex method

Interior-point methods became the second main family of linear-programming algorithms after Narendra Karmarkar introduced one at AT&T Bell Laboratories in 1984, and he proved that its running time is polynomial (Hillier and Lieberman, 2024, pp. 197, 200). The barrier method above gives the flavor of such bounds.

Each stage multiplies the gap $m\mu$ by $1/\kappa$. Starting from a gap of $m\mu_0$ and stopping at a target gap $\varepsilon$ takes $\log(m\mu_0/\varepsilon)/\log\kappa$ stages. With the cautious factor $\kappa=1+1/\sqrt m$, $\log\kappa$ is about $1/\sqrt m$, and each stage costs a bounded number of Newton steps, so the total is

<span id="eq:complexity"></span>

$$
O\!\left(\sqrt m\,\log\frac{m\mu_0}{\varepsilon}\right)\ \text{Newton steps}
\tag{15}
$$

(Boyd and Vandenberghe, 2004, §11.5.3). Bertsimas and Tsitsiklis give the analogous worst-case bound $O(\sqrt n\,\log(\varepsilon_0/\varepsilon))$ for primal-dual path following in standard form, with $n$ variables and initial gap $\varepsilon_0$ (1997, §9.5).

The logarithm appears because the gap shrinks geometrically: every stage cuts it by the same factor, so every extra correct digit costs the same number of stages: shrinking the gap from $10^{-4}$ to $10^{-8}$ costs as many stages as shrinking it from 1 to $10^{-4}$. The $\sqrt m$ comes from the cautious reduction factor. Practice is much better than this worst case. The barrier method almost always needs a few tens of Newton steps, a number that grows very slowly with problem size (Boyd and Vandenberghe, 2004, §11.3). The observed behavior of primal-dual methods is about $O(\log n\,\log(\varepsilon_0/\varepsilon))$ iterations, which theory has not yet fully explained (Bertsimas and Tsitsiklis, 1997, §9.5).

Each Newton step solves Equation [(12)](#eq:newton-barrier), an $n\times n$ system with matrix $A^\top\operatorname{diag}(\lambda_i/s_i)A$. For dense data, forming it costs $O(mn^2)$ operations and factoring it $O(n^3)$. Large real problems are sparse, and solvers use sparse factorizations, but one interior-point iteration is still far more expensive than one simplex pivot.

The simplex method sits at the opposite extreme. In the worst case it can visit an exponential number of corners, as Klee and Minty showed in 1972, but in practice it typically needs on the order of $m$ pivots, each a cheap update (Bertsimas and Tsitsiklis, 1997, §3.7). Hillier and Lieberman (2024, pp. 200–201) summarize the trade-offs:

- An interior-point iteration costs much more than a simplex pivot, but the number of iterations grows far more slowly with problem size.
- Interior-point methods need crossover to obtain a corner solution.
- Interior-point methods use parallel processors well; the simplex method does not.
- The simplex method makes much better use of a good starting point, such as the solution of yesterday’s similar problem.
- The simplex method tends to win on problems of moderate size and interior-point methods on very large ones. Leading solvers offer both and sometimes run them in parallel.

## Summary

The barrier problem replaces hard constraints with logarithmic walls of strength $\mu$. Its zero-slope equation, read with the weights $\lambda_i=\mu/s_i$, is the dual feasibility condition, so every point on the central path comes with dual prices for free. Weak duality turns those prices into a certificate, and the gap is the total value of idle resources, exactly $m\mu$. Solving the zero-slope equation for a tiny $\mu$ in one go is unreliable, so path following shrinks $\mu$ step by step and uses Newton’s method on each new equation. Although the equation changes at every stage, its root moves by a fixed fraction of the distance to the walls, and Newton’s reliable region is measured in the same relative units. The previous answer is therefore always a good start for the next, which is what makes interior-point methods polynomial in theory and fast in practice.

## References

1. Stephen Boyd and Lieven Vandenberghe. *Convex Optimization*. Cambridge University Press, 2004. Chapters 9 and 11.
2. Dimitris Bertsimas and John N. Tsitsiklis. *Introduction to Linear Optimization*. Athena Scientific, 1997. Chapters 3, 4, and 9.
3. Frederick S. Hillier and Gerald J. Lieberman. *Introduction to Operations Research*, 12th edition. McGraw-Hill, 2024. Section 4.11.
4. Narendra Karmarkar. “A New Polynomial-Time Algorithm for Linear Programming.” *Combinatorica*, 4(4):373–395, 1984.
5. Sanjay Mehrotra. “On the Implementation of a Primal-Dual Interior Point Method.” *SIAM Journal on Optimization*, 2(4):575–601, 1992.
6. Victor Klee and George J. Minty. “How Good Is the Simplex Algorithm?” In O. Shisha, editor, *Inequalities III*, pages 159–175. Academic Press, 1972.
