<?php

add_action( 'after_setup_theme', function () {
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script' ) );
} );

add_action( 'wp_enqueue_scripts', function () {
	wp_enqueue_style( 'lifecharge-blog', get_stylesheet_uri(), array(), '1.0.0' );
} );

add_filter( 'excerpt_length', function () {
	return 24;
} );

add_filter( 'excerpt_more', function () {
	return '...';
} );

function lifecharge_reading_time( $post_id = null ) {
	$post_id = $post_id ? $post_id : get_the_ID();
	$words   = str_word_count( wp_strip_all_tags( get_post_field( 'post_content', $post_id ) ) );
	return max( 1, (int) ceil( $words / 220 ) );
}
