const expressAsyncHandler = require('express-async-handler');
const { FoodMenu, WeeklyFoodMenu } = require('../models/FoodModel');
const notificationService = require('../services/notificationService');
const Announcement = require('../models/AnnouncementModel');

// Epoch for rotation (choose a Monday so week boundaries align). You can change this later.
const ROTATION_EPOCH_UTC = new Date(Date.UTC(2025, 0, 6)); // 2025-01-06 (Monday)

function getRotationWeekIndex(date = new Date()) {
    // normalize date to UTC midnight
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksSinceEpoch = Math.floor((d - ROTATION_EPOCH_UTC) / msPerWeek);
    const idx = ((weeksSinceEpoch % 4) + 4) % 4; // ensure positive
    return idx + 1; // 1..4
}

/**
 * Get template menu data (returns the 4 rotation templates)
 */
const getMonthlyMenu = expressAsyncHandler(async (req, res) => {
    try {
        // Fetch all 4 templates (week 1..4)
        const weeklyMenus = await WeeklyFoodMenu.find({}).sort({ week: 1 });
        
        res.status(200).json({
            success: true,
            data: weeklyMenus
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Update day menu
 */
const updateDayMenu = expressAsyncHandler(async (req, res) => {
    try {
        const { date, week, day, breakfast, lunch, snacks, dinner } = req.body;
        
        let dateObj;
        
        // If date is provided, use it directly
        if (date) {
            dateObj = new Date(date);
            dateObj.setHours(0, 0, 0, 0);
            
            // Validate menu freeze deadline with 10 AM cutoff rule
            const now = new Date();
            const currentHour = now.getHours();
            const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            currentDate.setHours(0, 0, 0, 0);
            
            const tomorrow = new Date(currentDate);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            
            const dayAfterTomorrow = new Date(currentDate);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
            dayAfterTomorrow.setHours(0, 0, 0, 0);
            
            // Calculate cutoff date based on current time
            // Before 10 AM: Can update tomorrow onwards
            // After 10 AM: Can only update day after tomorrow onwards (tomorrow is frozen)
            const cutoffDate = currentHour >= 17 ? dayAfterTomorrow : tomorrow;
            
            // STRICT RULE: Menu must be updated before 10 AM on the previous day
            // Before 10 AM today: Can update tomorrow onwards
            // After 10 AM today: Can only update day after tomorrow onwards
            if (dateObj.getTime() < cutoffDate.getTime()) {
                
                const requestedDateFormatted = dateObj.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                
                const cutoffDateFormatted = cutoffDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                });
                
                // Format current time
                const currentMinutes = now.getMinutes().toString().padStart(2, '0');
                const displayHour = currentHour > 12 ? currentHour - 12 : (currentHour === 0 ? 12 : currentHour);
                const amPm = currentHour >= 12 ? 'PM' : 'AM';
                const currentTimeFormatted = `${displayHour}:${currentMinutes} ${amPm}`;
                
                // Create detailed message based on time
                let timeRuleMessage;
                if (currentHour >= 17) {
                    timeRuleMessage = `⏰ It is currently ${currentTimeFormatted}.\n\n🚫 Menu updates for tomorrow must be completed before 5:00 PM today.\n\nSince it's past 5:00 PM, you can no longer update tomorrow's menu.`;
                } else {
                    timeRuleMessage = `⏰ It is currently ${currentTimeFormatted}.\n\n✅ You can still update tomorrow's menu until 5:00 PM today.\n\nHowever, today's menu should have been set yesterday.`;
                }
                
                return res.status(403).json({ 
                    success: false,
                    type: 'MENU_FROZEN',
                    alertType: 'error',
                    alertTitle: '⚠️ Menu Update Blocked',
                    alertMessage: `You cannot update the menu for ${requestedDateFormatted}!\n\n${timeRuleMessage}\n\n📋 MENU UPDATE RULE:\nMenus must be updated before 5:00 PM on the previous day.`,
                    error: 'Menu is frozen! This date\'s menu cannot be changed.',
                    currentDate: currentDate.toISOString().split('T')[0],
                    currentTime: currentTimeFormatted,
                    currentHour: currentHour,
                    requestedDate: dateObj.toISOString().split('T')[0],
                    minimumAllowedDate: cutoffDate.toISOString().split('T')[0],
                    message: `📅 Menu for ${requestedDateFormatted} is frozen.\n\n✅ You can update menu for ${cutoffDateFormatted} and onwards.\n\n💡 Tip: Always update menus before 5:00 PM on the previous day!`,
                    suggestion: `Please update the menu for ${cutoffDateFormatted} or future dates. Remember: Updates must be done before 5:00 PM on the day before.`
                });
            }
        }
        // If week and day are provided, calculate the date from rotation
        else if (week && day) {
            
            // This is a template update for the weekly rotation
            const weekNumber = parseInt(week.toString().replace('week', ''));
            
            if (!weekNumber || isNaN(weekNumber) || weekNumber < 1 || weekNumber > 4) {
                return res.status(400).json({ success: false, error: 'Invalid week number' });
            }
            
            const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const dayLower = day.toString().toLowerCase();
            
            if (!validDays.includes(dayLower)) {
                return res.status(400).json({ success: false, error: 'Invalid day' });
            }
            
            // CHECK IF THIS TEMPLATE UPDATE AFFECTS TODAY'S OR TOMORROW'S MENU (based on 5 PM cutoff)
            const now = new Date();
            const currentHour = now.getHours();
            const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            currentDate.setHours(0, 0, 0, 0);
            
            const tomorrow = new Date(currentDate);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            
            // Get current rotation week
            const currentRotationWeek = getRotationWeekIndex(currentDate);
            const tomorrowRotationWeek = getRotationWeekIndex(tomorrow);
            
            // Get current day name and tomorrow's day name
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const currentDayName = dayNames[currentDate.getDay()];
            const tomorrowDayName = dayNames[tomorrow.getDay()];
            
            // BLOCK if trying to update today's active template
            if (weekNumber === currentRotationWeek && dayLower === currentDayName) {
                
                const todayFormatted = currentDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                
                // Format current time
                const currentMinutes = now.getMinutes().toString().padStart(2, '0');
                const displayHour = currentHour > 12 ? currentHour - 12 : (currentHour === 0 ? 12 : currentHour);
                const amPm = currentHour >= 12 ? 'PM' : 'AM';
                const currentTimeFormatted = `${displayHour}:${currentMinutes} ${amPm}`;
                
                    return res.status(403).json({
                        success: false,
                        type: 'MENU_FROZEN',
                        alertType: 'error',
                        alertTitle: '⚠️ Menu Update Blocked',
                        alertMessage: `You cannot update the menu right now!\n\nToday's menu (${todayFormatted}) should have been updated YESTERDAY before 5:00 PM.\n\n⏰ Current time: ${currentTimeFormatted}\n\n📋 MENU UPDATE RULE:\nMenus must be updated before 5:00 PM on the previous day.`,
                        error: 'Menu is FROZEN! This template affects today\'s menu and cannot be changed.',
                        currentDate: currentDate.toISOString().split('T')[0],
                        currentRotationWeek: currentRotationWeek,
                        currentDay: currentDayName,
                        attemptedWeek: weekNumber,
                        attemptedDay: dayLower,
                        message: `📅 Today's menu for ${todayFormatted} is frozen.\n\n✅ You can update tomorrow's menu (${tomorrow.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}) and onwards.\n\n💡 Tip: Always plan and set menus at least 1 day ahead!`,
                        minimumAllowedDate: tomorrow.toISOString().split('T')[0],
                        suggestion: 'Please update the menu for tomorrow or future dates.'
                    });
            }
            
            // BLOCK if trying to update tomorrow's menu after 10 AM
            if (currentHour >= 17 && weekNumber === tomorrowRotationWeek && dayLower === tomorrowDayName) {
                
                const tomorrowFormatted = tomorrow.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                
                const dayAfterTomorrow = new Date(tomorrow);
                dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
                const dayAfterTomorrowFormatted = dayAfterTomorrow.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                });
                
                // Format current time
                const currentMinutes = now.getMinutes().toString().padStart(2, '0');
                const displayHour = currentHour > 12 ? currentHour - 12 : (currentHour === 0 ? 12 : currentHour);
                const amPm = currentHour >= 12 ? 'PM' : 'AM';
                const currentTimeFormatted = `${displayHour}:${currentMinutes} ${amPm}`;
                
                return res.status(403).json({
                    success: false,
                    type: 'MENU_FROZEN',
                    alertType: 'error',
                    alertTitle: '⚠️ Menu Update Blocked - 5:00 PM Deadline Passed',
                    alertMessage: `You cannot update tomorrow's menu (${tomorrowFormatted})!\n\n⏰ Current time: ${currentTimeFormatted}\n\n🚫 Menu updates for tomorrow must be completed before 5:00 PM today.\n\nSince it's past 5:00 PM, tomorrow's menu is now frozen.\n\n📋 MENU UPDATE RULE:\nMenus must be updated before 5:00 PM on the previous day.`,
                    error: 'Menu is FROZEN! Tomorrow\'s menu deadline (5:00 PM) has passed.',
                    currentDate: currentDate.toISOString().split('T')[0],
                    currentTime: currentTimeFormatted,
                    currentHour: currentHour,
                    tomorrowDate: tomorrow.toISOString().split('T')[0],
                    currentRotationWeek: tomorrowRotationWeek,
                    currentDay: tomorrowDayName,
                    attemptedWeek: weekNumber,
                    attemptedDay: dayLower,
                    message: `📅 Tomorrow's menu for ${tomorrowFormatted} is frozen (5:00 PM deadline passed).\n\n✅ You can update menu for ${dayAfterTomorrowFormatted} and onwards.\n\n💡 Remember: Always update menus before 5:00 PM on the previous day!`,
                    minimumAllowedDate: dayAfterTomorrow.toISOString().split('T')[0],
                    suggestion: `Please update the menu for ${dayAfterTomorrowFormatted} or future dates. Remember: Updates must be done before 5:00 PM on the day before.`
                });
            }
            
            // Update the weekly rotation template instead
            const emptyWeekStructure = {
                monday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
                tuesday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
                wednesday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
                thursday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
                friday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
                saturday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
                sunday: { breakfast: '', lunch: '', snacks: '', dinner: '' }
            };
            
            let weeklyMenu = await WeeklyFoodMenu.findOne({
                week: weekNumber
            });
            
            if (!weeklyMenu) {
                weeklyMenu = new WeeklyFoodMenu({
                    week: weekNumber,
                    days: emptyWeekStructure
                });
            }
            
            weeklyMenu.days[dayLower] = {
                breakfast: breakfast || '',
                lunch: lunch || '',
                snacks: snacks || '',
                dinner: dinner || ''
            };
            
            await weeklyMenu.save();

            // Try to find the next calendar date that will be affected by this template change
            try {
                const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const findNextDateForRotation = (startDate, targetWeek, targetDayName) => {
                    const maxLookahead = 28; // 4 rotation cycles
                    for (let i = 1; i <= maxLookahead; i++) {
                        const candidate = new Date(startDate);
                        candidate.setDate(startDate.getDate() + i);
                        candidate.setHours(0,0,0,0);
                        if (getRotationWeekIndex(candidate) === targetWeek && dayNames[candidate.getDay()] === targetDayName) {
                            return candidate;
                        }
                    }
                    return null;
                };

                const today = new Date();
                const nextAffected = findNextDateForRotation(today, weekNumber, dayLower);
                const formatted = nextAffected
                    ? nextAffected.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                    : null;

                const capDay = dayLower.charAt(0).toUpperCase() + dayLower.slice(1);

                // Build a compact summary of the new menu items for that template day
                const menuForDay = (weeklyMenu.days && weeklyMenu.days[dayLower]) || {};
                const menuParts = [];
                if (menuForDay.breakfast) menuParts.push(`Breakfast: ${menuForDay.breakfast}`);
                if (menuForDay.lunch) menuParts.push(`Lunch: ${menuForDay.lunch}`);
                if (menuForDay.snacks) menuParts.push(`Snacks: ${menuForDay.snacks}`);
                if (menuForDay.dinner) menuParts.push(`Dinner: ${menuForDay.dinner}`);
                const menuSummary = menuParts.length ? menuParts.join(' | ') : 'No menu items provided.';

                const header = formatted
                    ? `Menu updated for ${capDay}. This change will apply on ${formatted}.`
                    : `Menu updated for ${capDay}. It will take effect on the upcoming weeks.`;

                const desc = `${header}`;

                await Announcement.create({
                    title: 'Menu Updated',
                    description: desc
                });
            } catch (annErr) {
                console.error('Failed to create announcement for template update:', annErr);
            }

            return res.status(200).json({
                success: true,
                message: 'Menu template updated successfully',
                data: weeklyMenu.days[dayLower]
            });
        }
        else {
            return res.status(400).json({ success: false, error: 'Either date or (week and day) are required' });
        }
        
        // Update the daily menu (if date was provided)
        const updated = await FoodMenu.findOneAndUpdate(
            { date: dateObj },
            {
                breakfast: breakfast || '',
                lunch: lunch || '',
                snacks: snacks || '',
                dinner: dinner || '',
                lastModified: new Date(),
                modificationReason: 'Regular menu update'
            },
            { new: true, upsert: true }
        );

        // Create an announcement for today informing students/wardens that the menu
        // for the upcoming date was updated. This announcement is intentionally
        // short and created with the current timestamp so it appears among today's announcements.
        try {
            const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            await Announcement.create({
                title: 'Menu Updated',
                description: `The menu has been updated for ${formattedDate}. Please check the Food Menu section for details.`
            });
        } catch (annErr) {
            console.error('Failed to create announcement for menu update:', annErr);
        }

        res.status(200).json({
            success: true,
            message: 'Menu updated successfully',
            data: updated
        });
        
    } catch (error) {
        console.error('Error updating day menu:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update menu',
            error: error.message
        });
    }
});

// Get current week number
const getCurrentWeek = expressAsyncHandler(async (req, res) => {
    try {
        const now = new Date();
        const dayOfWeek = now.getDay();
        
        // Calculate week start (Sunday = 0)
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - dayOfWeek);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        
        const menus = await FoodMenu.find({
            date: {
                $gte: weekStart,
                $lt: weekEnd
            }
        }).sort({ date: 1 });
        
        res.status(200).json({
            success: true,
            weekStart: weekStart.toISOString().split('T')[0],
            weekEnd: weekEnd.toISOString().split('T')[0],
            menus: menus
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// Create or update entire week menu
const updateWeekMenu = expressAsyncHandler(async (req, res) => {
    try {
        const { weekData } = req.body;
        
        if (!weekData || !Array.isArray(weekData)) {
            return res.status(400).json({ success: false, error: 'Week data array is required' });
        }
        
        const now = new Date();
        const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        currentDate.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(currentDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const updatedMenus = [];
        const rejectedDates = [];
        
        for (const dayMenu of weekData) {
            const dateObj = new Date(dayMenu.date);
            dateObj.setHours(0, 0, 0, 0);
            
            // Validate: menu must be set at least 1 day before (cannot update today)
            // Can only update tomorrow onwards
            if (dateObj.getTime() <= currentDate.getTime()) {
                rejectedDates.push({
                    date: dateObj.toISOString().split('T')[0],
                    reason: 'Menu is frozen! Today\'s menu cannot be changed. It should have been set yesterday.'
                });
                continue;
            }
            
            const updated = await FoodMenu.findOneAndUpdate(
                { date: dateObj },
                {
                    breakfast: dayMenu.breakfast || '',
                    lunch: dayMenu.lunch || '',
                    snacks: dayMenu.snacks || '',
                    dinner: dayMenu.dinner || '',
                    lastModified: new Date(),
                    isEmergencyChange: false,
                    modificationReason: 'Regular menu update'
                },
                { new: true, upsert: true }
            );
            
            updatedMenus.push(updated);
        }
        
        if (rejectedDates.length > 0 && updatedMenus.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'All dates rejected due to freeze deadline',
                rejectedDates: rejectedDates,
                minimumAllowedDate: dayAfterTomorrow.toISOString().split('T')[0]
            });
        }

        // Create an announcement summarizing which dates were updated in this bulk operation
        try {
            if (updatedMenus.length > 0) {
                const formattedDates = updatedMenus.map(u => {
                    const d = new Date(u.date);
                    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                });

                const desc = `Menu updated for the following upcoming date(s): ${formattedDates.join(', ')}. Please check the Food Menu section for details.`;
                await Announcement.create({ title: 'Weekly Menu Updated', description: desc });
            }
        } catch (annErr) {
            console.error('Failed to create announcement for bulk week update:', annErr);
        }

        res.status(200).json({
            success: true,
            message: updatedMenus.length > 0 
                ? `Week menu updated successfully. ${updatedMenus.length} day(s) updated.` 
                : 'No menus updated',
            menus: updatedMenus,
            rejectedDates: rejectedDates.length > 0 ? rejectedDates : undefined
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = {
    getMonthlyMenu,
    updateDayMenu,
    getCurrentWeek,
    updateWeekMenu
};
