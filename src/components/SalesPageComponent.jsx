import SideBar from "./SideBar";
import StudetTable from "./studentTable/StudentTable";
import TopBar from "./TopBar";

export default function SalesPageComponent() {
  return (
    <main className="flex w-full justify-between">
      <div>
        <SideBar key={true}/>
      </div>
      <div className="w-full mx-auto">
        <div className="w-[90%] flex flex-col gap-[40px] mx-auto">
          <TopBar />
          <StudetTable />
        </div>
      </div>
    </main>
  );
}
