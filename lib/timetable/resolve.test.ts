import { test } from "node:test";
import assert from "node:assert/strict";
import { classesOn, findClash, nowAndNext, type ExceptionRow, type SlotRow } from "./resolve";

const slots: SlotRow[] = [
  { id: "b", courseId: "dbms", dayOfWeek: 1, startMin: 600, endMin: 660, roomId: "r1", teacherId: "t2" },
  { id: "a", courseId: "os", dayOfWeek: 1, startMin: 540, endMin: 600, roomId: "r1", teacherId: "t1" },
  { id: "c", courseId: "os", dayOfWeek: 2, startMin: 540, endMin: 600, roomId: "r1", teacherId: "t1" },
];

const none: ExceptionRow = {
  slotId: "", cancelled: false, startMin: null, endMin: null, roomId: null, substituteId: null, note: null,
};

test("only that weekday's slots, in time order", () => {
  const day = classesOn(1, slots, []);
  assert.deepEqual(day.map((c) => c.slotId), ["a", "b"]);
  assert.equal(day.every((c) => !c.changed && !c.cancelled), true);
});

test("a holiday has no classes", () => {
  assert.deepEqual(classesOn(1, slots, [], true), []);
});

test("cancellation keeps the class but marks it", () => {
  const day = classesOn(1, slots, [{ ...none, slotId: "a", cancelled: true, note: "Teacher away" }]);
  assert.equal(day[0].cancelled, true);
  assert.equal(day[0].note, "Teacher away");
});

test("reschedule moves the class and re-sorts", () => {
  const day = classesOn(1, slots, [{ ...none, slotId: "a", startMin: 720, endMin: 780 }]);
  assert.deepEqual(day.map((c) => c.slotId), ["b", "a"]);
  assert.equal(day[1].changed, true);
  assert.equal(day[1].startMin, 720);
});

test("substitute takes the class; room change applies", () => {
  const [a] = classesOn(1, slots, [{ ...none, slotId: "a", substituteId: "t9", roomId: "r2" }]);
  assert.equal(a.teacherId, "t9");
  assert.equal(a.regularTeacherId, "t1");
  assert.equal(a.roomId, "r2");
  assert.equal(a.changed, true);
});

test("now and next skip cancelled classes", () => {
  const day = classesOn(1, slots, [{ ...none, slotId: "a", cancelled: true }]);
  assert.deepEqual(nowAndNext(day, 550), { now: null, next: day[1] });
  assert.equal(nowAndNext(day, 600).now?.slotId, "b");
  assert.equal(nowAndNext(day, 660).now, null); // end is exclusive
});

const base = { dayOfWeek: 1, startMin: 540, endMin: 600, roomId: "r1", teacherId: "t1", sectionId: "A" };

test("clash on section, teacher or room when times overlap", () => {
  assert.equal(findClash({ ...base, roomId: "r9", teacherId: "t9" }, [base])?.reason, "section");
  assert.equal(findClash({ ...base, sectionId: "B", roomId: "r9" }, [base])?.reason, "teacher");
  assert.equal(findClash({ ...base, sectionId: "B", teacherId: "t9" }, [base])?.reason, "room");
});

test("no clash back to back, on another day, or with itself", () => {
  assert.equal(findClash({ ...base, startMin: 600, endMin: 660 }, [base]), null);
  assert.equal(findClash({ ...base, dayOfWeek: 2 }, [base]), null);
  assert.equal(findClash({ ...base, id: "x" }, [{ ...base, id: "x" }]), null);
  assert.equal(findClash({ ...base, sectionId: "B", teacherId: "t9", roomId: null }, [base]), null);
});
