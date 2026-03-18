
const path = require("path");
const { listAvailableSlots } = require(path.resolve('calendar.js'));


(async () => {
  const slots = await listAvailableSlots({ calendarIds: ["desenvolvedor.ricardo@gmail.com"] });
  console.log(slots);
})();