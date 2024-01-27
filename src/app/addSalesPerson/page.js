"use client";
import ModalComponent from "@/components/modals";
import React from "react";
import Link from "next/link";
import { HomeIcon, MailIcon } from "@/shared/svgImages/navBarImages";

const AddSalesPerson = () => {
  return (
    <main className="h-[100vh] flex items-center relative justify-center bg-Light_Cyan">
      <form
        className={` h-[450px] rounded-[16px]  px-[40px] border shadow py-[38px] flex flex-col w-[454px] gap-[24px] bg-white`}
      >
        <div className="flex absolute top-[50px] left-[80px] border bg-white px-[15px] items-center py-[10px] rounded-[16px] shadow gap-[10px] font-[700] text-[12px] tracking-wide">
          <HomeIcon />
          <Link href="/">
            <span className="uppercase"> go to home</span>
          </Link>
        </div>
        <p className="text-center w-full text-[24px] font-[600] leading-[normal]">
          Add New Sales Person
        </p>
        <div className="flex flex-col mt-[50px] gap-[8px]">
          <label
            className="block text-[13px] font-semibold  text-gray-900"
            htmlFor="Email ID"
          >
            Email ID
          </label>
          <div className="border-silver focus-within:border-vivid_orange focus-within:border  w-full gap-[8px] rounded-[8px] py-1 px-[15px] border flex">
            <MailIcon />
            <input
              required
              type="email"
              id="Email ID"
              name="Email ID"
              className="focus:outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full p-[12px] mt-[40px] font-[600] text-center bg-vivid_orange text-white text-[16px] rounded-[8px]"
        >
          Submit
        </button>
      </form>
    </main>
  );
};

export default AddSalesPerson;
