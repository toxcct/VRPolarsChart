<?php
	include($_SERVER["DOCUMENT_ROOT"] . "/include/php_global_start.inc.php");
	require_once($_SERVER["DOCUMENT_ROOT"] . '/include/dto/user.dto.php');
	require_once($_SERVER["DOCUMENT_ROOT"] . '/include/libs/send_emails.lib.php');

	try {
		include($_SERVER["DOCUMENT_ROOT"] . "/include/php_global_try.inc.php");
		//include($_SERVER["DOCUMENT_ROOT"] . "/include/php_global_try_notlogged.inc.php");
		CLog::debug("Contact Email à propos des Polaires");
		$_SESSION['Action'] = "Contact Email à propos des Polaires";

		//Calculates the Redirection address
		if (!empty($_REQUEST['RedirectUrl'])) {
			$RedirectUrl = urldecode($_REQUEST['RedirectUrl']);
		}
		else {
			$urldomain = parse_url($_SERVER['HTTP_REFERER'], PHP_URL_HOST);
			if (($urldomain == Config::getAppValue(Config::APP_DOMAINNAME)) || ($urldomain == 'localhost')) {
				$RedirectUrl = $_SERVER['HTTP_REFERER'];
			}
			else {
				$RedirectUrl = '/polars/';
			}
		}

		$reason = $from = $username = $subject = $msg = "";
		$regex		= "/^([a-z0-9\+_\-]+)(\.[a-z0-9\+_\-]+)*@([a-z0-9\-]+\.)+[a-z]{2,6}$/ix";
		$to			= Config::getEmailValue(Config::EMAIL_WEBMASTERMAIL);
		$setFocus	= 'fld_emailaddr';

		if (isset($_REQUEST['action'])) {
			if ($_REQUEST['action'] == 'submit') {
				$reason		= stripslashes($_POST['reason']);
				$from		= stripslashes($_POST['emailaddr']);
				$username	= stripslashes($_POST['username']);
				$subject	= stripslashes($_POST['subject']);
				$msg		= stripslashes($_POST['msg']);

				if (empty($msg)) {
					$error = "Message body is mandatory";
					$setFocus = 'fld_body';
					$classes['fld_body'] = 'red_out';
				}
				if (empty($subject)) {
					$error = "Subject is mandatory";
					$setFocus = 'fld_subject';
					$classes['fld_subject'] = 'red_out';
				}
				if (empty($username)) {
					$error = "Username is mandatory";
					$setFocus = 'fld_nickname';
					$classes['fld_nickname'] = 'red_out';
				}
				if (empty($from)) {
					$error = "Email address is mandatory";
					$setFocus = 'fld_emailaddr';
					$classes['fld_emailaddr'] = 'red_out';
				}
				else if (!preg_match($regex, $from)) {
					$error = "Email address is invalid";
					$setFocus = 'fld_emailaddr';
					$classes['fld_emailaddr'] = 'red_out';
				}

				if (!isset($error)) {
					$newSubject = '[Polars] ' . (!empty($reason) ? "[$reason] " : '') . $subject;
					DefinedEmailsCatalog::envoiEmailPolarsDirect($from, $to, $username, $newSubject, $msg)->send();
					header("Location: " . $RedirectUrl);
					exit();
				}
				else {
					CLog::warn("Error while attempting to send an Email : $error");
				}
			}
		}

	} catch (Exception $e) {
		include($_SERVER["DOCUMENT_ROOT"] . "/include/php_global_catch.inc.php");
	}

	$_SESSION['t_redir'] = $RedirectUrl;

?><!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
	<title>Help | Contact Me</title>
	<meta http-equiv="content-type" content="text/html; charset=utf-8">
	<meta name="description"	lang="en" content="Toxcct's Polars Contact Form">
	<meta name="abstract"		lang="en" content="Toxcct's Polars Chart for Virtual Regatta Offshore">
	<meta name="title"			lang="en" content="Toxcct's Polars Chart for Virtual Regatta Offshore Races">
	<meta name="author"			lang="en" content="toxcct">
	<meta name="keywords"		content="toxcct, Polars, Chart, Virtual, Regatta, Offshore, Boat, Race, Races, Zezo">
	<meta name="robots"			content="all">
	<meta name="rating"			content="General">
	<meta name="category"		content="Sport">
	<meta name="publisher"		content="Toxcct">
	<meta name="copyright"		content="Toxcct 2018">
 	<meta name="viewport"		content="width=device-width, initial-scale=1">
 	<link rel="icon"			type="image/png" href="favicon-help.png" />
	<link rel="stylesheet"		type="text/css"	 href="css/general.css?v=12" />
	<link rel="stylesheet"		type="text/css"	 href="css/contact.css?v=3" />
	<script type="text/javascript" src="js/lib/jquery-3.2.1.min.js"></script>
	<script type="text/javascript" src="js/contact.js?v=11"></script>
	<script type="text/javascript" src="js/lib/gtag.js?v=2"></script>
</head>

<body>
	<header id="_top"></header>
	<article class="grid2cols">
		<div class="column1">
			<div class="sticky">
				<div class="sidebox grid1cols">
					<span><a href="./help/">&loarr; Help Section</a></span>
				</div>
				<div class="sidebox grid1cols">
					<span><a href="./">&loarr; Polars Chart Application</a></span>
				</div>
				<div class="sidebox grid1cols">
					<span><a href="./generator.htm">&loarr; CSV Generator Application</a></span>
				</div>
			</div>
		</div>

		<div class="column2">
			<div class="contentframe">
				<h1>Contact Me</h1>
			</div>

			<div class="contentframe">
				<form method="POST" id="contactForm" action="contact.php">
					<input type="hidden" name="action" value="submit" />
					<input type="hidden" name="RedirectUrl" value="<?=urlencode($RedirectUrl) ?>" />
					<input type="hidden" name="reason" value="<?=$reason ?>" />

					<label for="fld_reason">Reason<span class=""></span></label>
					<select id="fld_reason">
						<option></option>
						<option<?=$reason == 'Report Bug'			? ' selected' : '' ?>>Report Bug</option>
						<option<?=$reason == 'Report Data Issue'	? ' selected' : '' ?>>Report Data Issue</option>
						<option<?=$reason == 'Request Feature'		? ' selected' : '' ?>>Request Feature</option>
						<option<?=$reason == 'Other'				? ' selected' : '' ?>>Other</option>
					</select>

					<label for="fld_emailaddr">Email Address<span class="mandatory"></span></label>
					<input type="text" name="emailaddr" id="fld_emailaddr"
						<?=isset($classes['fld_emailaddr']) ? ' class="' . $classes['fld_emailaddr'] . '"' : '' ?> value="<?=$emailaddr ?>" autocomplete="email" <?=$setFocus == 'fld_emailaddr' ? 'autofocus' : '' ?> />

					<label for="fld_nickname">Nickname<span class="mandatory"></span></label>
					<input type="text" name="username" id="fld_nickname"
						<?=isset($classes['fld_nickname']) ? ' class="' . $classes['fld_nickname'] . '"' : '' ?> value="<?=$username ?>" autocomplete="username" <?=$setFocus == 'fld_nickname' ? 'autofocus' : '' ?> />

					<label for="fld_subject">Subject<span class="mandatory"></span></label>
					<input type="text" name="subject"  id="fld_subject"
						<?=isset($classes['fld_subject']) ? ' class="' . $classes['fld_subject'] . '"' : '' ?> value="<?=$subject ?>" <?=$setFocus == 'fld_subject' ? 'autofocus' : '' ?> />

					<label for="fld_body">Message<span class="mandatory"></span></label>
					<textarea name="msg" id="fld_body"
						<?=isset($classes['fld_body']) ? ' class="' . $classes['fld_body'] . '"' : '' ?> <?=$setFocus == 'fld_body' ? 'autofocus' : '' ?> ><?=$msg ?></textarea>

					<span class="space<? /*isset($error) ? " error" : "" ?>"><?=isset($error) ? $error : "" */ ?>"></span>

					<input type="submit" class="bigBlueButton" value="Send Email" id="btn_sendmail" disabled />
				</form>
			</div>
		</div>
	</article>
</body>
</html>