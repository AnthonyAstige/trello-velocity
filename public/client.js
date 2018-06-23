$(function() {
	$.get('/dreams', function(dreams) {
		dreams.forEach(function(dream) {
			const [title, stats] = dream.split(' : ');
			$(`<div class='dream'><span class="title">${title}</span> : <span class="stats">${stats}</span></div>`).appendTo('#dreams');
		});
		$('.title').click((e) => console.log($(e.target).closest('.dream').find('.stats').addClass('show')));
    $('.ignoring').show();
	});
});
