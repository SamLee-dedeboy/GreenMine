from numpy import dot
from numpy.linalg import norm
from collections import defaultdict
import numpy as np
from . import dr

def normalize_weight(links):
    def sigmoid(x): 
        return 1/(1 + pow(2.71828, -x))
    def min_max_norm(x, min, max):
        return (x - min) / (max - min)
    max_weight = 0
    min_weight = 100
    avg_weight = 0
    for link in links:
        max_weight = max(max_weight, link[2])
        min_weight = min(min_weight, link[2])
        avg_weight += link[2]
    avg_weight /= len(links)

    for link in links:
        link[2] = min_max_norm(link[2] - avg_weight, min_weight - avg_weight, max_weight - avg_weight)
    return links
def cosine_similarity(a, b):
    return dot(a, b)/(norm(a)*norm(b))
def chunk_cosine_similarity(chunk_embeddings):
    chunk_links = []
    for i in range(len(chunk_embeddings)):
        for j in range(i+1, len(chunk_embeddings)):
            chunk_1 = chunk_embeddings[i]
            chunk_2 = chunk_embeddings[j]
            v1 = np.array(chunk_1['embedding'])
            v2 = np.array(chunk_2['embedding'])
            similarity = cosine_similarity(v1, v2)
            chunk_links.append([chunk_1['id'], chunk_2['id'], similarity])
    return chunk_links
def group_by_key(data, key):
    groups = defaultdict(list)
    for d in data:
        groups[d[key]].append(d)
    return groups
def tsne_by_topic(chunks_by_topic):
    chunk_coordinates = {}
    for topic, chunks in chunks_by_topic.items():
        print(topic, len(chunks))
        embeddings = np.array([chunk['embedding'] for chunk in chunks])
        tsne = dr.scatter_plot(embeddings, method="tsne")
        for chunk, XY in zip(chunks, tsne):
            chunk_coordinates[chunk['id']] = XY.tolist()
    return chunk_coordinates
