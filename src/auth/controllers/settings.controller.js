import { User } from "../../user.data.js";

export const updateUserSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    const userId = req.userId;

    const user = await User.findByIdAndUpdate(
      userId,
      { settings },
      { new: true },
    ).select("-password");

    res.json({ success: true, user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getUserSettings = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    res.json({ success: true, settings: user.settings });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
