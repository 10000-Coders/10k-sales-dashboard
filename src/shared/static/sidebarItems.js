import { GgList } from "../svgImages/sideBarImages";

export const routeObject = {
  "/": "Dashboard",
  "/sales-persons": "Sales persons",
  "/leads": "Leads",
  "/activities": "Activities",
  "/students": "Students",
  "/payments": "Payments",
  "/batches": "Batches",
};

export const MenuItems = [
  { text: "Dashboard", imgBlack: <GgList />, imgWhite: <GgList fill="white" /> },
  { text: "Sales persons", imgBlack: <GgList />, imgWhite: <GgList fill="white" />, managerOnly: true },
  { text: "Leads", imgBlack: <GgList />, imgWhite: <GgList fill="white" /> },
  { text: "Activities", imgBlack: <GgList />, imgWhite: <GgList fill="white" /> },
  { text: "Students", imgBlack: <GgList />, imgWhite: <GgList fill="white" /> },
  { text: "Payments", imgBlack: <GgList />, imgWhite: <GgList fill="white" />, adminOrManagerOnly: true, allowCounselor: true },
  { text: "Batches", imgBlack: <GgList />, imgWhite: <GgList fill="white" />, managerOnly: true },
];
