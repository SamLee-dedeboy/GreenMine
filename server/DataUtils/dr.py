from sklearn.manifold import MDS, TSNE, LocallyLinearEmbedding
from sklearn.metrics.pairwise import cosine_distances
from sklearn.decomposition import PCA, KernelPCA
from sklearn.preprocessing import StandardScaler
from scipy.optimize import minimize


# import umap
import math
import numpy as np


def scatter_plot(X, method="tsne"):
    X = np.array(X)
    scaler = StandardScaler().fit(X)
    estimator = None
    X = scaler.transform(X)
    if method == "pca":
        XY = PCA(n_components=2).fit_transform(X)
    if method == "kernel_pca":
        estimator = KernelPCA(n_components=2, kernel="cosine").fit(X)
        XY = estimator.transform(X)
    if method == "tsne":
        XY = TSNE(
            n_components=2,
            learning_rate="auto",
            init="random",
            perplexity=min(50, math.ceil(X.shape[0] / 2)),
            metric="cosine",
        ).fit_transform(X)
    # if method == "umap":
    #     reducer = umap.UMAP()
    #     XY = reducer.fit_transform(X)
    if method == "mds":
        XY = MDS(n_components=2).fit_transform(X)
    init_positions = XY
    XY, min_val, max_val = min_max_normalize(XY)
    # return XY
    return XY, estimator, scaler, min_val, max_val, init_positions


def one_d_dr(X, method="tsne"):
    X = np.array(X)
    scaler = StandardScaler().fit(X)
    estimator = None
    X = scaler.transform(X)
    if method == "kernel_pca":
        estimator = KernelPCA(n_components=1, kernel="cosine").fit(X)
        X = estimator.transform(X)
    if method == "tsne":
        X = TSNE(
            n_components=1,
            learning_rate="auto",
            init="random",
            perplexity=min(50, math.ceil(X.shape[0] / 2)),
            metric="cosine",
        ).fit_transform(X)
    X, min_val, max_val = min_max_normalize(X)
    return X


def init_kpca_reducer(X):
    X = np.array(X)
    scaler = StandardScaler().fit(X)
    X = scaler.transform(X)
    estimator = KernelPCA(n_components=2, kernel="cosine").fit(X)
    XY = estimator.transform(X)
    XY, min_val, max_val = min_max_normalize(XY)
    return {
        "scaler": scaler,
        "estimator": estimator,
        "min_val": min_val,
        "max_val": max_val,
    }


def reapply_dr(X, scaler, estimator, min_val, max_val):
    X = np.array(X)
    X = scaler.transform(X)
    XY = estimator.transform(X)
    XY, _, _ = min_max_normalize(XY, min_val, max_val)
    return XY


def getEquidistantPoints(p1, p2, parts):
    return zip(*[np.linspace(p1[i], p2[i], parts + 1) for i in range(len(p1))])


def min_max_normalize(data, min_vals=None, max_vals=None):
    if min_vals is None:
        min_vals = np.min(data, axis=0)
    if max_vals is None:
        max_vals = np.max(data, axis=0)

    normalized_data = np.clip(
        (data - min_vals) / (max_vals - min_vals), a_min=0, a_max=1
    )

    return normalized_data, min_vals, max_vals


def circular_dr(X):
    D = cosine_distances(X)
    angles = optimize_positions(D)
    return angles


def objective(theta, D):
    """
    Objective function to minimize: sum of squared differences between
    circular distances and the given distance matrix D.

    Parameters:
    - theta: array of angles (in radians) for each point.
    - D: n x n distance matrix.

    Returns:
    - Sum of squared differences.
    """
    n = len(theta)
    # Compute pairwise circular distances
    d = 1 - np.cos(
        np.minimum(
            np.abs(theta[:, np.newaxis] - theta[np.newaxis, :]),
            2 * np.pi - np.abs(theta[:, np.newaxis] - theta[np.newaxis, :]),
        )
    )

    # Compute the difference only for i < j to avoid double counting and zero diagonals
    mask = np.triu(np.ones((n, n)), k=1).astype(bool)
    diff = d[mask] - 2 * D[mask]

    return np.sum(diff**2)


def optimize_positions(D, initial_theta=None, verbose=False):
    """
    Optimize the positions of points on a circle to preserve the distances in D.

    Parameters:
    - D: n x n distance matrix.
    - initial_theta: Optional initial guess for the angles.
    - verbose: If True, print optimization details.

    Returns:
    - Optimized angles theta (in radians).
    """
    n = D.shape[0]

    d_min = np.min(D)
    d_max = np.max(D)
    D = (D - d_min) / (d_max - d_min)
    if initial_theta is None:
        # Initialize theta randomly between 0 and 2pi
        initial_theta = np.random.uniform(0, 2 * np.pi, n)

    # Define bounds for each theta: [0, 2pi]
    bounds = [(0, 2 * np.pi) for _ in range(n)]

    # Optionally, fix the first angle to 0 to remove rotational symmetry
    # Uncomment the following lines if you want to fix theta_0 = 0
    # bounds = [(0, 0)] + [(0, 2 * np.pi) for _ in range(n - 1)]

    # Define the objective function with D fixed
    obj = lambda theta: objective(theta, D)

    # Perform the optimization
    result = minimize(
        obj,
        initial_theta,
        method="L-BFGS-B",
        bounds=bounds,
        options={"disp": verbose, "maxfun": 9999999},
    )

    if not result.success:
        raise ValueError("Optimization failed: " + result.message)

    optimized_theta = result.x
    return optimized_theta
