 // Compte à rebours
    const targetDate = new Date("October 15, 2026 00:00:00").getTime();
    function updateCountdown() {
      const now = new Date().getTime();
      const distance = targetDate - now;
      if (distance < 0) {
        document.getElementById("countdown").innerHTML = "C'est arrivé !";
        return;
      }
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      document.getElementById("countdown").innerHTML =
        `${days}j ${hours}h ${minutes}m ${seconds}s`;
    }
    setInterval(updateCountdown, 1000);

    // Masquer le loader après chargement
    window.addEventListener("load", function() {
      const loader = document.getElementById("loader");
      const content = document.querySelector(".content");
      loader.style.opacity = "0";
      setTimeout(() => {
        loader.style.display = "none";
        content.classList.add("show");
      }, 1000);
    });
