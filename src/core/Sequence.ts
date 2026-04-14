class Node<T> {
  constructor(
    public data: T,
    public next: Node<T> | null = null,
    public prev: Node<T> | null = null
  ) {}
}

export class Sequence<T> {
  public head: Node<T> | null = null;
  public tail: Node<T> | null = null;
  public current: Node<T> | null = null;
  public size = 0;

  append(data: T): void {
    const newNode = new Node(data);
    if (!this.head) {
      this.head = this.tail = this.current = newNode;
    } else {
      newNode.prev = this.tail;
      this.tail!.next = newNode;
      this.tail = newNode;
    }
    this.size++;
  }

  getCurrentData(): T | null {
    return this.current ? this.current.data : null;
  }

  next(): T | null {
    if (!this.current) return null;
    this.current = this.current.next || this.head;
    return this.current ? this.current.data : null;
  }

  prev(): T | null {
    if (!this.current) return null;
    this.current = this.current.prev || this.tail;
    return this.current ? this.current.data : null;
  }

  goTo(index: number): T | null {
    let temp = this.head;
    for (let i = 0; i < index && temp; i++) temp = temp.next;
    this.current = temp;
    return temp ? temp.data : null;
  }
}