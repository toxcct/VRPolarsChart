
//= On DOM Ready ==================//
$(function() {

	//Hack to be able to transmit 'Reason' field value even though the Field is 'disabled'
	$("#fld_reason").change(function(evt){
		$("input[name='reason']").val( $("#fld_reason").val() );
	})

	//Email Address validation
	$("#fld_emailaddr").on("change", function(evt){
		$("#fld_emailaddr").val( $("#fld_emailaddr").val().trim() );

		var val = $("#fld_emailaddr").val();
		var rx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

		$("#fld_emailaddr").removeClass();
		if (!rx.test(val)) {
			$("#fld_emailaddr").addClass("red_out");
		}
		else {
			$("#fld_emailaddr").addClass("green_out");
		}
	});

	//Nickname validation
	$("#fld_nickname").on("change", function(evt){
		$("#fld_nickname" ).val( $("#fld_nickname" ).val().trim() );

		var len = $(evt.target).val().length;
		if (!len)	$(evt.target).addClass("red_out");
		else		$(evt.target).removeClass();
	});

	//Subject validation
	$("#fld_subject").on("change", function(evt){
		$("#fld_subject"  ).val( $("#fld_subject"  ).val().trim() );

		var len = $(evt.target).val().length;
		if (!len)	$(evt.target).addClass("red_out");
		else		$(evt.target).removeClass();
	});

	//Message Body validation
	$("#fld_body").on("change", function(evt){
		var len = $(evt.target).val().trim().length;
		if (!len)	$(evt.target).addClass("red_out");
		else		$(evt.target).removeClass();
	});

	//Enables/Disables the "Send Email" button
	$("#fld_emailaddr, #fld_nickname, #fld_subject, #fld_body")
		.on("change keydown paste", function(evt){
			setTimeout(
				function(){
					$("#btn_sendmail").prop("disabled",
						!$("#fld_emailaddr"	).val().trim().length ||
						!$("#fld_nickname"	).val().trim().length ||
						!$("#fld_subject"	).val().trim().length ||
						!$("#fld_body"		).val().trim().length
					);
				},
				0
			);
		});

	//Sending Email
	$("#contactForm").submit(function(evt){
		$("#fld_emailaddr").val( $("#fld_emailaddr").val().trim() );
		$("#fld_nickname" ).val( $("#fld_nickname" ).val().trim() );
		$("#fld_subject"  ).val( $("#fld_subject"  ).val().trim() );

		var email = $("#fld_emailaddr").val();
		var rx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

		if (!rx.test(email)) {
			$("#fld_emailaddr").addClass("red_out").focus();
			evt.preventDefault();
			return;
		}

		if (!$("#fld_nickname").val().trim().length) {
			$("#fld_nickname").addClass("red_out").focus();
			evt.preventDefault();
			return;
		}

		if (!$("#fld_subject").val().trim().length) {
			$("#fld_subject").addClass("red_out").focus();
			evt.preventDefault();
			return;
		}

		if (!$("#fld_body").val().trim().length) {
			$("#fld_body").addClass("red_out").focus();
			evt.preventDefault();
			return;
		}

		$("#btn_sendmail").attr("value", "Sending...").prop("disabled", true);
		$("#fld_emailaddr, #fld_nickname, #fld_subject, #fld_body").attr("readonly", true);
		$("#fld_reason").prop("disabled", true);
	});

	//Ctrl+Enter shortcut to send mail
	$(document).keydown(function(evt){
		if (evt.key === "Enter" && evt.ctrlKey && !evt.altKey && !evt.shiftKey) {
			$("#contactForm").submit();
		}
	});
});
//=================================//
