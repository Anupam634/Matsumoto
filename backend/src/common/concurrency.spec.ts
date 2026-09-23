import { createGate } from './concurrency';

describe('createGate', () => {
  function tracked() {
    let active = 0;
    let peak = 0;
    const order: number[] = [];
    const task = (id: number, ms = 5) => async () => {
      active++;
      peak = Math.max(peak, active);
      order.push(id);
      await new Promise((r) => setTimeout(r, ms));
      active--;
      return id;
    };
    return { task, peak: () => peak, order };
  }

  it('never runs more than the limit at once', async () => {
    const { task, peak } = tracked();
    const gate = createGate(3);
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    await expect(Promise.all(ids.map((i) => gate(task(i))))).resolves.toEqual(ids);
    expect(peak()).toBe(3);
  });

  it('starts queued tasks in the order they were handed over', async () => {
    const { task, order } = tracked();
    const gate = createGate(2);
    await Promise.all([1, 2, 3, 4, 5].map((i) => gate(task(i))));
    expect(order).toEqual([1, 2, 3, 4, 5]);
  });

  it('frees its slot when a task throws, rather than wedging the gate', async () => {
    const gate = createGate(1);
    await expect(gate(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(gate(async () => 'still works')).resolves.toBe('still works');
  });

  it('treats a nonsense limit as one', async () => {
    const { task, peak } = tracked();
    const gate = createGate(0);
    await Promise.all([1, 2, 3].map((i) => gate(task(i))));
    expect(peak()).toBe(1);
  });
});
