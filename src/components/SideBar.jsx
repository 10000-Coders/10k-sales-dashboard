'use client';
import Image from 'next/image';
import {useRouter, usePathname} from 'next/navigation';
import {useEffect, useState} from 'react';
import {routeObject, MenuItems} from '@/shared/static/sidebarItems';
import Link from 'next/link';

export default function SideBar() {
  const [activeItem, setActiveitem] = useState('');
  const {push} = useRouter();
  const path = usePathname();
  const [pathName, setPathName] = useState(path);
  useEffect(() => {
    setActiveitem(routeObject[pathName]);
    console.log();
  }, []);
  const handleActiveItem = text => {
    const slug = text.toLowerCase().replace(' ', '').replace('-', '');
    text === 'All Requests' ? push('/') : push(`/${slug}`);
    setActiveitem(text);
  };
  const SideBarItem = ({text, imgWhite, imgBlack, itemNo}) => (
    <li
      className={`py-[12px] relative cursor-pointer ${
        activeItem === text ? 'bg-[#FF8000] text-white' : 'hover:bg-[rgb(0,0,0,0.1)]'
      } w-[250px] px-[30px] rounded-r-full`}
      onClick={() => {
        handleActiveItem(text);
      }}>
      <div className="flex w-[175px] items-center justify-between">
        <p className="font-[500]">{text}</p>
        {activeItem === text ? imgWhite : imgBlack}
        {text === 'Unread Requests' ? (
          <div className="w-[25px] h-[25px] absolute right-[30px] top-[2px] flex rounded-full bg-fireRed items-center justify-center text-white">
            0
          </div>
        ) : (
          ''
        )}
      </div>
    </li>
  );
  return (
    <main className="flex w-fit flex-col">
      <Image
        className="flex-shrink-0 mt-[11px] mb-[13px]"
        width={133}
        height={64}
        src="/sideBar_Images/logo.png"
        alt=""
      />
      {/* <Link
        href="/batches"
        className={`${
          pathName === '/batches' ? ' bg-vivid_orange ' : 'bg-[#B5B5B5]'
        } cursor-pointer items-center hover:bg-vivid_orange mb-[38px] ml-[10px] p-[12px] w-fit rounded-[16px] gap-[8px] flex `}>
        <Image width={18} height={18} alt="" src="/sideBar_Images/vector.svg" />
        <p className="text-white text-[16px] font-[700] leading-[normal] ">Add Batch</p>
      </Link> */}
      <div>
        <ul className=" w-fit flex flex-col items-center">
          {MenuItems.map((item, idx) => {
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
