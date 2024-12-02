export function registerAnimation() {
    // 769px 以上の場合のみ実行
    if (window.innerWidth < 769) return;

    const floatElements = document.querySelectorAll('.js-floating');
    window.addEventListener('scroll', () => {
        const scroll = window.scrollY;
        floatElements.forEach((element) => {
            element.style.translate = `0 ${-scroll * 0.075}px`;
        });
    });
}
