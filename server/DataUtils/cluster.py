from sklearn.cluster import AgglomerativeClustering, OPTICS
from sklearn.preprocessing import StandardScaler
import numpy as np


def cluster(X):
    X = np.array(X)
    clustering = AgglomerativeClustering(
        n_clusters=None,
        distance_threshold=0.5,
        metric="cosine",
        linkage="average",
    ).fit(X)
    return list(map(lambda label: int(label), clustering.labels_))


def optics(X, min_samples=6, metric="cosine"):
    scaler = StandardScaler()
    X = np.array(X)
    X = scaler.fit_transform(X)
    clustering = OPTICS(min_samples=min_samples, metric=metric).fit(X)
    return list(map(lambda label: int(label), clustering.labels_))
