import { Search } from "@/shared/svgImages/navBarImages";

export default function TopBar() {
  return (
    <nav className="gap-[250px] flex justify-between w-[100%] mt-[22px]">
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
      <div className="flex w-[54px] items-center justify-center h-[54px] rounded-full bg-black text-white">
       <p className="text-[12px] font-[400]">Admin</p>
      </div>
    </nav>
  );
}
