"use client";
import { useDispatch, useSelector } from "react-redux";
import { increment, decrement } from "@/redux/features/counter/counterSlice";

export default function Counter() {
  const count = useSelector((state) => state.counter.value);
  const dispatch = useDispatch();

  return (
    <div>
      <h1>Counter: {count}</h1>
      <button
        style={{ padding: "5px", backgroundColor: "red" }}
        onClick={() => dispatch(increment())}
      >
        Increment
      </button>
      <button className="bg-orange-300" onClick={() => dispatch(decrement())}>
        Decrement
      </button>
    </div>
  );
}
