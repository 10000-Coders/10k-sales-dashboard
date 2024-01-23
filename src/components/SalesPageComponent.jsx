"use client";
import { useState } from "react";
import SideBar from "./SideBar";
import StudetTable from "./studentTable/StudentTable";
import TopBar from "./TopBar";

export default function SalesPageComponent() {
  const [selectedItem, setSelectedItem] = useState();
  const handleSelectedItem = (selectedItem) => {
    setSelectedItem(selectedItem);
  };
  return (
    <main className="flex w-full justify-between">
      <div>
        <SideBar handleCallBack={handleSelectedItem} />
      </div>
      <div className="w-full mx-auto">
        <div className="w-[90%] flex flex-col gap-[40px] mx-auto">
          <TopBar />
          <StudetTable filterItemBy={selectedItem} />
        </div>
      </div>
    </main>
  );
}
