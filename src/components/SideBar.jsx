"use client";
import Image from "next/image";
import { Block, GgList, Label, Tick } from "../shared/svgImages/sideBarImages";
import { useState } from "react";

export default function SideBar({ handleCallBack }) {
  const [activeItem, setActiveItem] = useState("All Requests");
  const handleActiveItem = (text) => {
    setActiveItem(text);
    handleCallBack(text);
  };
  const menu = [
    {
      text: "All Requests",
      imgBlack: <GgList />,
      imgWhite: <GgList fill="white" />,
    },
    {
      text: "Unread Requests",
      imgBlack: <GgList />,
      imgWhite: <GgList fill="white" />,
    },
    {
      text: "Important",
      imgBlack: <Label />,
      imgWhite: <Label fill="white" />,
    },
    {
      text: "Completed",
      imgBlack: <Tick />,
      imgWhite: <Tick stroke="white" />,
    },
    {
      text: "Not Intrested",
      imgBlack: <Block />,
      imgWhite: <Block fill="white" />,
    },
  ];
  const SideBarItem = ({ text, imgWhite, imgBlack, itemNo }) => (
    <li
      className={`py-[12px] cursor-pointer ${
        activeItem === text
          ? "bg-Vivid_Tangelo text-white"
          : "hover:bg-[#B5B5B5]"
      } w-[250px] px-[30px] rounded-r-full`}
      onClick={() => {
        handleActiveItem(text);
      }}
    >
      <div className="flex w-[175px] justify-between">
        <p className="font-[500]">{text}</p>{" "}
        {activeItem === text ? imgWhite : imgBlack}
      </div>
    </li>
  );
  return (
    <main className="flex flex-col">
      <Image
        className="flex-shrink-0 mt-[11px] mb-[13px]"
        width={133}
        height={64}
        src="/sideBar_Images/logo.png"
      />
      <div className=" bg-gray-400 mb-[38px] ml-[10px] p-[12px] w-fit rounded-[16px] gap-[8px] items-center flex ">
        <Image width={18} height={18} src="/sideBar_Images/vector.svg" />
        <p className="text-white text-[16px] font-[700] leading-[normal] ">
          New Student
        </p>
      </div>

      <div>
        <ul className=" w-fit flex flex-col items-center">
          {menu.map((item, idx) => {
            return (
              <SideBarItem
                key={idx}
                text={item.text}
                itemNo={idx + 1}
                imgWhite={item.imgWhite}
                imgBlack={item.imgBlack}
              />
            );
          })}
        </ul>
      </div>
    </main>
  );
}
