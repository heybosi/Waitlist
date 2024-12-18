import { Request, Response, Router } from "express";
import { IPinfoWrapper } from "node-ipinfo";
import { Tracker, Volunteer, WaitingUser } from "./database";
import {
  sendVolunteerEmail,
  sendVolunteerNotification,
  sendWaitNotification,
  sendWaitingUserEmail,
} from "./email";

import { config } from "dotenv";

config();

const router = Router();
const ipinfoWrapper = new IPinfoWrapper(process.env.TOKEN!);

router.post("/track", async (req: Request, res: Response) => {
  const { endpoint } = req.body;
  try {
    const ip: string = req.ip!;
    const data = await ipinfoWrapper.lookupIp(ip);

    await Tracker.create({
      country: data.country,
      city: data.city,
      hits: 1,
      endpoint: endpoint,
    });
    res.status(200).json({ message: "Event tracked successfully" });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/join", async (req: Request, res: Response) => {
  try {
    const { name, email, test, pro, recommendFeatures } = req.body

    if(!(name && email && test && pro)){
      res.status(401).json({message: "All fields are required"})
    }

    const checkEmail = await WaitingUser.findOne({ where: { email } });

    if (checkEmail) {
      res
        .status(401)
        .json({ message: "You've already joined our waiting list..." });
    } else {
      const waiting = await WaitingUser.create({
        name,
        email,
        test,
        pro,
        recommendFeatures,
      });
      await sendWaitingUserEmail(waiting);
      await sendWaitNotification(waiting);
      res.status(201).json({ message: "Thank you for joining..." });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/volunteer", async (req: Request, res: Response) => {
  try {
    const { name, email, profession, experience } = req.body;
    const checkEmail = await Volunteer.findOne({ where: { email } });

    if (checkEmail) {
      res.status(401).json({
        message:
          "You've already joined our volunteer list. We'd reach out soon...",
      });
    } else {
      const volunteer = await Volunteer.create({
        name,
        email,
        profession,
        experience,
      });

      await sendVolunteerEmail(volunteer);
      await sendVolunteerNotification(volunteer);
      res.status(201).json({ message: "Thank you for volunteering..." });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as apiRoute };
