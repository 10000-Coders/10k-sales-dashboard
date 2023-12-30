import SideBar from "../sideBar/sideBar";
import StudetTable from "../studentTable/studentTable";
import TopBar from "../topBar/topBar";

export default function SalesPageComponent() {
  return (
    <main className="flex">
      <SideBar />
      <div>
        <TopBar />
        <StudetTable />
      </div>
    </main>
  );
}
