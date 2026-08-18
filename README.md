# AI Virtual Try-On

An AI-powered virtual fashion try-on web application that allows users to explore real Amazon fashion products, view product details, upload their own photo, and visualize how selected clothing may look on them.

The project combines a modern React frontend, a FastAPI backend, and Amazon product data retrieved through Oxylabs.

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Project Objective](#project-objective)
- [Key Features](#key-features)
- [Application Flow](#application-flow)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Frontend](#frontend)
- [Backend](#backend)
- [Amazon Product Integration](#amazon-product-integration)
- [Product Search](#product-search)
- [Product Details](#product-details)
- [Filters and Categories](#filters-and-categories)
- [Virtual Try-On Flow](#virtual-try-on-flow)
- [Homepage](#homepage)
- [Environment Variables](#environment-variables)
- [Installation and Setup](#installation-and-setup)
- [Running the Project](#running-the-project)
- [API Endpoints](#api-endpoints)
- [Current Project Status](#current-project-status)
- [Future Scope](#future-scope)
- [Git Branch](#git-branch)
- [Demo](#demo)
- [Contributors](#contributors)

---

# Overview

AI Virtual Try-On is a fashion technology platform designed to improve the online shopping experience.

Instead of simply browsing product images, users can:

1. Explore fashion products.
2. Search products by category.
3. Filter products by different attributes.
4. View real Amazon product images and information.
5. Open detailed product pages.
6. View multiple product images when available.
7. Save products to their wishlist.
8. Select a product for virtual try-on.
9. Upload their photograph.
10. Proceed through the virtual try-on workflow.

The goal is to provide users with a more interactive and confidence-oriented shopping experience.

---

# Problem Statement

Online fashion shopping has an important limitation:

> Users cannot physically see how a particular garment will look on them before purchasing it.

Traditional product pages provide:

- Product photographs
- Product descriptions
- Sizes
- Prices
- Ratings

However, these do not show how the selected garment would appear on the individual user.

This project aims to address this limitation by combining:

- Real fashion product data
- Product discovery
- Product filtering
- User-uploaded photographs
- AI-based virtual try-on functionality

---

# Project Objective

The main objectives of the project are:

- Build a complete fashion shopping interface.
- Integrate real Amazon product data.
- Display real product images instead of mock products.
- Provide product search and category navigation.
- Provide price, gender, color and size filtering.
- Display detailed product information.
- Allow users to select products for virtual try-on.
- Provide an intuitive interface for uploading user photographs.
- Build the foundation for AI-powered garment visualization.

---

# Key Features

## 1. Real Amazon Products

The application retrieves real Amazon fashion products instead of relying only on static mock products.

Product information can include:

- Product title
- Brand
- Price
- Currency
- Rating
- Review count
- Product image
- Product URL
- ASIN
- Prime status
- Sponsored status
- Product categories
- Product overview
- Available sizes
- Stock information

---

## 2. Product Categories

Users can explore products through multiple categories.

Currently supported categories include:

- All
- Women
- Men
- Dresses
- Tops
- Shirts
- Jeans
- Jackets
- Blazers
- Skirts
- T-Shirts

---

## 3. Product Search

Users can search for products such as:

- Dresses
- Shirts
- Jackets
- Jeans
- Tops
- T-Shirts
- Women's clothing
- Men's clothing

Search requests are sent to the backend, which retrieves product information from Amazon through Oxylabs.

---

## 4. Product Filters

The product page supports filtering by:

### Price

- Under ₹1,000
- ₹1,000 – ₹2,000
- ₹2,000 – ₹3,000
- Above ₹3,000

### Gender

The available gender filters are obtained from the Amazon search refinements.

### Color

The available colors are obtained from the Amazon search refinements.

### Size

The available sizes are obtained from the Amazon search refinements.

---

## 5. Product Sorting

Products can be sorted using different options, including:

- Recommended
- Price: Low to High
- Price: High to Low
- Rating
- Newest

---

## 6. Product Details Page

Clicking a product opens its dedicated product details page.

The details page can display:

- Product name
- Brand
- Price
- Rating
- Number of reviews
- Product image
- Multiple product images
- Color
- Available sizes
- Stock status
- Category
- ASIN
- Product overview
- Amazon product link

Users can also:

- Save the product
- Start the try-on process
- Open the product on Amazon

---

## 7. Wishlist

Users can save products to their wishlist.

Wishlist functionality is implemented through the frontend wishlist hook and components.

---

## 8. Virtual Try-On

The application provides a virtual try-on workflow.

The basic flow is:

```text
Browse Products
      ↓
Select Product
      ↓
Try On
      ↓
Upload User Photo
      ↓
Process Image
      ↓
Virtual Try-On Result