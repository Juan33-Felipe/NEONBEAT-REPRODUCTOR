export class Node<T> {
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

  insertAfterCurrent(data: T): void {
    if (!this.current || !this.head) {
      this.append(data);
      return;
    }
    const newNode = new Node(data);
    const nextNode = this.current.next;
    newNode.prev = this.current;
    newNode.next = nextNode;
    this.current.next = newNode;
    if (nextNode) {
      nextNode.prev = newNode;
    } else {
      this.tail = newNode;
    }
    this.size++;
  }

  removeAt(index: number): T | null {
    if (index < 0 || index >= this.size || !this.head) return null;

    let target: Node<T> | null = this.head;
    for (let i = 0; i < index && target; i++) {
      target = target.next;
    }
    if (!target) return null;

    if (target.prev) {
      target.prev.next = target.next;
    } else {
      this.head = target.next;
    }

    if (target.next) {
      target.next.prev = target.prev;
    } else {
      this.tail = target.prev;
    }

    if (this.current === target) {
      this.current = target.next || target.prev || null;
    }

    target.next = null;
    target.prev = null;
    this.size--;
    return target.data;
  }

  move(fromIndex: number, toIndex: number): void {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      fromIndex >= this.size ||
      toIndex < 0 ||
      toIndex >= this.size ||
      !this.head
    ) {
      return;
    }

    const currentData = this.current ? this.current.data : null;
    const items = this.toArray();
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);

    this.clear();

    for (const item of items) {
      this.append(item);
    }

    if (currentData !== null) {
      let temp: Node<T> | null = this.head;
      while (temp) {
        if (temp.data === currentData) {
          this.current = temp;
          break;
        }
        temp = temp.next;
      }
    }
  }

  getCurrentData(): T | null {
    return this.current ? this.current.data : null;
  }

  getCurrentIndex(): number {
    let index = 0;
    let temp = this.head;
    while (temp && temp !== this.current) {
      index++;
      temp = temp.next;
    }
    return temp ? index : -1;
  }

  next(wrap = true): T | null {
    if (!this.current) return null;
    if (this.current.next) {
      this.current = this.current.next;
      return this.current.data;
    }
    if (wrap && this.head) {
      this.current = this.head;
      return this.current.data;
    }
    return null;
  }

  prev(wrap = true): T | null {
    if (!this.current) return null;
    if (this.current.prev) {
      this.current = this.current.prev;
      return this.current.data;
    }
    if (wrap && this.tail) {
      this.current = this.tail;
      return this.current.data;
    }
    return null;
  }

  goTo(index: number): T | null {
    if (index < 0 || index >= this.size) return null;
    let temp = this.head;
    for (let i = 0; i < index && temp; i++) temp = temp.next;
    this.current = temp;
    return temp ? temp.data : null;
  }

  toArray(): T[] {
    const result: T[] = [];
    let temp = this.head;
    while (temp) {
      result.push(temp.data);
      temp = temp.next;
    }
    return result;
  }

  clear(): void {
    this.head = null;
    this.tail = null;
    this.current = null;
    this.size = 0;
  }
}
