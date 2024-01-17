/**
 * My homebrewed 2D Vector class
 **/
class Vector {
    x;
    y;
    constructor(x = 0, y = 0) {
    [this.x, this.y] = [x, y];
    }
    array() {
    return [this.x, this.y];
    }
    clone() {
    // A copy of this vector
    return new Vector(this.x, this.y);
    }
    mag() {
    // Magnitude (length)
    return Math.sqrt(this.dot(this));
    }
    set(other) {
    // Set from another vector
    [this.x, this.y] = [other.x, other.y];
    }
    add(v) {
    // Vector sum
    return new Vector(this.x + v.x, this.y + v.y);
    }
    sub(v) {
    // Vector subtraction
    return new Vector(this.x - v.x, this.y - v.y);
    }
    dist(q) {
    // Distance to point
    return this.sub(q).mag();
    }
    dot(q) {
    // Dot product
    return this.x * q.x + this.y * q.y;
    }
    angle(v) {
    // Returns the angle between this vector and v
    return Math.acos(
        Math.min(Math.max(this.dot(v) / this.mag() / v.mag(), -1), 1)
    );
    }
    scale(alpha) {
    // Multiplication by scalar
    return new Vector(this.x * alpha, this.y * alpha);
    }
    rotate(angle) {
    // Returns this vector rotated by angle radians
    let [c, s] = [Math.cos(angle), Math.sin(angle)];
    return new Vector(c * this.x - s * this.y, s * this.x + c * this.y);
    }
    mix(q, alpha) {
    // this vector * (1-alpha) + q * alpha
    return new Vector(
        this.x * (1 - alpha) + q.x * alpha,
        this.y * (1 - alpha) + q.y * alpha
    );
    }
    normalize() {
    // this vector normalized
    return this.scale(1 / this.mag());
    }
    distSegment(p, q) {
    // Distance to line segment
    var s = p.dist(q);
    if (s < 0.00001) return this.dist(p);
    var v = q.sub(p).scale(1.0 / s);
    var u = this.sub(p);
    var d = u.dot(v);
    if (d < 0) return this.dist(p);
    if (d > s) return this.dist(q);
    return p.mix(q, d / s).dist(this);
    }
}

export default Vector;