"use client"
import { useState } from "react";
import Link from "next/link";
import { LogOutIcon, ProfileIcon, Search } from "@/shared/svgImages/navBarImages";

export default function TopBar() {
  const [dropDown, setdropDown] = useState(false);
  const handleDropDown = () => setdropDown(!dropDown);
  return (
    <nav className="gap-[250px] flex relative justify-between w-[100%] mt-[22px]">
      <div className="w-[703px] px-[25px] bg-[#ECECEC] rounded-[32px] gap-[32px] items-center flex h-[53px]">
        <label htmlFor="search">
          <Search />
        </label>
        <input
          type="text"
          placeholder="Search Student"
          className="placeholder:text-[16px] bg-inherit w-full placeholder:text-black focus:outline-none font-[400]"
          name="search"
          id="search"
        />
      </div>
      <div onClick={handleDropDown} className="flex cursor-pointer w-[54px] items-center shadow justify-center h-[54px] rounded-full bg-black text-white">
       <p className="text-[12px] font-[400]">Admin</p>
      </div>
      {dropDown && (
        <div className=" top-[70px] right-0 w-[180px] p-[15px]  pb-[3px] font-semibold py-[15px] border shadow z-10 absolute bg-white rounded-[16px] flex flex-col gap-[10px]">
          <div className="border-b cursor-pointer flex items-center gap-[10px]  pb-[3px] border-gray-100 hover:text-Vivid_Tangelo">
            <ProfileIcon fill="#FF8541" /> My Profile
          </div>
          
          <Link
            href="/login"
            className="border-b cursor-pointer flex gap-[10px] pb-[3px] border-gray-100 hover:text-Vivid_Tangelo"
          >
            <LogOutIcon stroke="#FF8541" /> Logout
          </Link>
        </div>
      )}
    </nav>
  );
}
